import { z } from 'zod'
import { WatchedContract, AlertPayload, Network } from '@/types'
import {
  STORAGE_QUOTA_BYTES,
  MAX_ALERTS_PER_CONTRACT,
  ALERTS_RETENTION_DAYS,
} from './constants'

const CONTRACTS_KEY = 'txwatch_contracts'
const ALERTS_KEY = 'txwatch_alerts'
const SETTINGS_KEY = 'txwatch_settings'
const STORAGE_VERSION_KEY = 'txwatch_storage_version'
const CURRENT_STORAGE_VERSION = 2

function getStorage(): Storage | undefined {
  if (typeof window !== 'undefined') return window.localStorage
  return (globalThis as unknown as { localStorage?: Storage }).localStorage
}

function load<S extends z.ZodTypeAny>(key: string, schema: S): z.infer<S>[] {
  const storage = getStorage()
  if (!storage) return []
  // Parse errors are reported to registered handlers by safeParseStorage
  const parsed = safeParseStorage<unknown>(key, [], storage)

  if (!Array.isArray(parsed)) {
    emitStorageError({
      key,
      rawValue: storage.getItem(key),
      error: new Error('Expected an array of entries'),
      timestamp: new Date().toISOString(),
    })
    return []
  }

  // Drop malformed or outdated entries instead of letting them crash render
  const valid: z.infer<S>[] = []
  for (const entry of parsed) {
    const result = schema.safeParse(entry)
    if (result.success) {
      valid.push(result.data)
    } else {
      emitStorageError({
        key,
        rawValue: JSON.stringify(entry) ?? null,
        error: result.error,
        timestamp: new Date().toISOString(),
      })
    }
  }
  return valid
}
function getStorageSize(): number {
  const storage = getStorage()
  if (!storage) return 0
  let size = 0
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (!key) continue
    const value = storage.getItem(key)
    if (value !== null) {
      size += value.length + key.length
    }
  }
  return size
}

function pruneOldAlerts(): void {
  const storage = getStorage()
  if (!storage) return
  const cutoff = Date.now() - ALERTS_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const alerts = load(ALERTS_KEY, AlertPayloadSchema)
  const pruned = alerts.filter((a) => a.timestamp >= cutoff)
  if (pruned.length < alerts.length) {
    storage.setItem(ALERTS_KEY, JSON.stringify(pruned))
  }
}

function trimAlertsToCutoff(cutoff: number): void {
  const storage = getStorage()
  if (!storage) return
  const alerts = load(ALERTS_KEY, AlertPayloadSchema)
  const trimmed = alerts.filter((a) => a.timestamp >= cutoff)
  if (trimmed.length < alerts.length) {
    storage.setItem(ALERTS_KEY, JSON.stringify(trimmed))
  }
}

function save<T>(key: string, data: T[]): void {
  const storage = getStorage()
  if (!storage) return

  if (key !== ALERTS_KEY) {
    pruneOldAlerts()
  }

  if (key === ALERTS_KEY) {
    const size = getStorageSize()
    if (size > STORAGE_QUOTA_BYTES * 0.9) {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      data = (data as AlertPayload[]).filter((a) => a.timestamp >= cutoff) as unknown as T[]
    }
    storage.setItem(key, JSON.stringify(data))
    return
  }

  storage.setItem(key, JSON.stringify(data))

  const size = getStorageSize()
  if (size > STORAGE_QUOTA_BYTES * 0.9) {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    trimAlertsToCutoff(cutoff)
  }
}

function getStorageVersion(): number {
  const storage = getStorage()
  if (!storage) return CURRENT_STORAGE_VERSION
  return parseInt(storage.getItem(STORAGE_VERSION_KEY) ?? '0', 10)
}

function setStorageVersion(version: number): void {
  const storage = getStorage()
  if (!storage) return
  storage.setItem(STORAGE_VERSION_KEY, version.toString())
}

export function migrateStorage(migrations: Record<number, () => void>): void {
  const currentVersion = getStorageVersion()
  for (let v = currentVersion + 1; v <= CURRENT_STORAGE_VERSION; v++) {
    if (migrations[v]) {
      migrations[v]()
    }
  }
  setStorageVersion(CURRENT_STORAGE_VERSION)
}

/**
 * Migration to v2:
 * - Normalizes LargeTransfer rules that only have `threshold_xlm` into the
 *   token-denominated shape (`asset` + `threshold`), while keeping
 *   `threshold_xlm` for backwards compatibility.
 * - Ensures settings exist with the default explorer preference.
 */
export function migrateToV2() {
  const storage = getStorage()
  if (!storage) return

  const contracts = load<WatchedContract>(CONTRACTS_KEY)
  let changed = false
  const migrated = contracts.map((contract) => {
    const rules = (contract as { rules?: unknown }).rules
    if (!Array.isArray(rules)) return contract

    let rulesChanged = false
    const nextRules = rules.map((rule) => {
      if (!rule || typeof rule !== 'object') return rule
      const r = rule as Record<string, unknown>
      if (r.type !== 'LargeTransfer') return rule

      const hasThresholdXlm = typeof r.threshold_xlm === 'number'
      const hasThreshold = typeof r.threshold === 'number'
      const hasAsset = typeof r.asset === 'string' && r.asset.length > 0

      if (!hasThresholdXlm || (hasThreshold && hasAsset)) return rule

      rulesChanged = true
      return {
        ...r,
        // Keep threshold_xlm for backwards compatibility.
        threshold_xlm: hasThresholdXlm ? r.threshold_xlm : undefined,
        // Default to native XLM when no asset was specified.
        asset: hasAsset ? r.asset : 'native',
        threshold: hasThreshold ? r.threshold : r.threshold_xlm,
      }
    })

    if (!rulesChanged) return contract
    changed = true
    return { ...contract, rules: nextRules } as WatchedContract
  })

  if (changed) {
    storage.setItem(CONTRACTS_KEY, JSON.stringify(migrated))
  }

  if (storage.getItem(SETTINGS_KEY) === null) {
    storage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))
  }
}

export function getSettings(): AppSettings {
  const storage = getStorage()
  if (!storage) return { ...DEFAULT_SETTINGS }
  try {
    const raw = storage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return { ...DEFAULT_SETTINGS, ...parsed }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const storage = getStorage()
  const merged = { ...getSettings(), ...settings }
  if (storage) {
    storage.setItem(SETTINGS_KEY, JSON.stringify(merged))
  }
  return merged
}

export function onSettingsChange(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) {
      callback()
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function getContracts(): WatchedContract[] {
  return load(CONTRACTS_KEY, WatchedContractSchema)
}

export function migrateContractsEnabled() {
  const contracts = load<WatchedContract>(CONTRACTS_KEY)
  let changed = false
  const migrated = contracts.map((contract) => {
    if (typeof contract.enabled === 'boolean') return contract
    changed = true
    return { ...contract, enabled: true }
  })
  if (changed) {
    save(CONTRACTS_KEY, migrated)
  }
}

export function getContract(id: string): WatchedContract | undefined {
  return getContracts().find((c) => c.id === id)
}

export function getNetworkDistribution(): Record<Network, number> {
  return getContracts().reduce((counts, contract) => {
    counts[contract.network] = (counts[contract.network] ?? 0) + 1
    return counts
  }, {} as Record<Network, number>)
}

export function getContractByIdAndNetwork(
  contractId: string,
  network: string
): WatchedContract | undefined {
  return getContracts().find((c) => c.contract_id === contractId && c.network === network)
}

export function saveContract(contract: WatchedContract): void {
  const contracts = getContracts().filter((c) => c.id !== contract.id)
  const updated: WatchedContract = { ...contract, updated_at: Date.now() }
  save(CONTRACTS_KEY, [...contracts, updated])
}

export function deleteContract(id: string): void {
  const contract = getContract(id)
  save(CONTRACTS_KEY, getContracts().filter((c) => c.id !== id))
  if (contract) {
    deleteAlerts(contract.contract_id)
  }
}

export function deleteAlerts(contractId: string): void {
  const alerts = load<AlertPayload>(ALERTS_KEY)
  save(ALERTS_KEY, alerts.filter((a) => a.contract_id !== contractId))
}

export function deleteAlert(alertId: string): void {
  const alerts = load<AlertPayload & { id?: string }>(ALERTS_KEY)
  save(ALERTS_KEY, alerts.filter((a) => a.id !== alertId))
}

/** Most recent alert timestamp per contract_id, computed in a single pass. */
export function computeLastAlertTimes(alerts: AlertPayload[]): Record<string, number> {
  const times: Record<string, number> = {}
  for (const alert of alerts) {
    const current = times[alert.contract_id]
    if (current === undefined || alert.timestamp > current) {
      times[alert.contract_id] = alert.timestamp
    }
  }
  return times
}

// Keyed on the raw stored string so the alerts array is only re-parsed when it changes
let lastAlertTimesCache: { raw: string | null; times: Record<string, number> } | null = null

export function getLastAlertTimes(): Record<string, number> {
  const storage = getStorage()
  if (!storage) return {}
  const raw = storage.getItem(ALERTS_KEY)
  if (lastAlertTimesCache && lastAlertTimesCache.raw === raw) {
    return lastAlertTimesCache.times
  }
  const times = computeLastAlertTimes(load(ALERTS_KEY, AlertPayloadSchema))
  lastAlertTimesCache = { raw, times }
  return times
}

export function getAllAlerts(): AlertPayload[] {
  return load(ALERTS_KEY, AlertPayloadSchema)
}

export function getAlerts(contractId: string): AlertPayload[] {
  return load(ALERTS_KEY, AlertPayloadSchema).filter(
    (a) => a.contract_id === contractId
  )
}

export function seedMockAlerts(
  contractId: string,
  network: Network,
  count = 5
): void {
  if (process.env.NODE_ENV === 'production') return
  if (typeof window === 'undefined') return

  const storage = getStorage()
  if (!storage) return

  const now = Date.now()
  const alerts = Array.from({ length: count }, (_, index) => {
    const sequence = index + 1
    const hash = `MOCK-${contractId.slice(0, 10)}-${sequence.toString().padStart(2, '0')}`
    const horizonHost = network === 'mainnet' ? 'horizon.stellar.org' : 'horizon-testnet.stellar.org'
    return {
      label: `Mock Alert ${sequence}`,
      contract_id: contractId,
      network,
      rule_triggered: 'AnyTransaction',
      transaction_hash: `${hash}-${Math.random().toString(16).slice(2, 18)}`,
      amount: 10 + index * 5,
      timestamp: now - index * 15 * 60 * 1000,
      horizon_link: `https://${horizonHost}/transactions/${hash}`,
    }
  })

  save(ALERTS_KEY, [...alerts, ...load(ALERTS_KEY, AlertPayloadSchema)])
}

export function addAlert(alert: AlertPayload | (AlertPayload & { contractId?: string; id?: string })): void {
  const normalizedAlert = {
    ...alert,
    contract_id: alert.contract_id ?? (alert as { contractId?: string }).contractId,
  }
  const all = [...load(ALERTS_KEY, AlertPayloadSchema), normalizedAlert]
  const counts: Record<string, number> = {}
  save(ALERTS_KEY, all.filter((a) => {
    counts[a.contract_id] = (counts[a.contract_id] ?? 0) + 1
    return counts[a.contract_id] <= MAX_ALERTS_PER_CONTRACT
  }))
}

export function deleteAlertsByContractId(contractId: string): void {
  const alerts = load<AlertPayload>(ALERTS_KEY)
  save(ALERTS_KEY, alerts.filter((a) => a.contract_id !== contractId))
}

export const saveAlert = addAlert

export function getTodayAlertCount(): number {
  const start = new Date().setHours(0, 0, 0, 0)
  return load(ALERTS_KEY, AlertPayloadSchema).filter((a) => a.timestamp >= start).length
}

export interface DailyAlertCount {
  date: string
  count: number
}

function formatDateKey(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDailyAlertCounts(
  contractIdOrAlerts: string | AlertPayload[],
  days = 30
): DailyAlertCount[] {
  const alerts = typeof contractIdOrAlerts === 'string'
    ? getAlerts(contractIdOrAlerts)
    : (contractIdOrAlerts ?? [])

  const countMap: Record<string, number> = {}
  for (const alert of alerts) {
    if (alert && alert.timestamp) {
      const key = formatDateKey(new Date(alert.timestamp))
      countMap[key] = (countMap[key] ?? 0) + 1
    }
  }

  const result: DailyAlertCount[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = formatDateKey(d)
    result.push({
      date: key,
      count: countMap[key] ?? 0,
    })
  }

  return result
}

export const getAlertCountsByDay = getDailyAlertCounts

export function onAlertsChange(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === ALERTS_KEY) {
      callback()
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

export function onContractsChange(callback: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === CONTRACTS_KEY) {
      callback()
    }
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}

/**
 * API key management for txwatch-core backend authentication.
 *
 * The key is stored in localStorage under `txwatch_api_key` and sent as a
 * Bearer token on requests to the txwatch-core API when
 * `NEXT_PUBLIC_API_URL` is configured.
 */
const API_KEY_STORAGE_KEY = 'txwatch_api_key'

export function getApiKey(): string | null {
  const storage = getStorage()
  if (!storage) return null
  return storage.getItem(API_KEY_STORAGE_KEY)
}

export function setApiKey(key: string): void {
  const storage = getStorage()
  if (!storage) return
  const trimmed = key.trim()
  if (trimmed) {
    storage.setItem(API_KEY_STORAGE_KEY, trimmed)
  } else {
    storage.removeItem(API_KEY_STORAGE_KEY)
  }
}

export function clearApiKey(): void {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(API_KEY_STORAGE_KEY)
}

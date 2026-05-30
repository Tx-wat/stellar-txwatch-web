import { WatchedContract, AlertPayload, Network } from '@/types'

const CONTRACTS_KEY = 'txwatch_contracts'
const ALERTS_KEY = 'txwatch_alerts'
const STORAGE_VERSION_KEY = 'txwatch_storage_version'
const CURRENT_STORAGE_VERSION = 1

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}

const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024 // 5MB typical limit
const ALERTS_RETENTION_DAYS = 90

function getStorageSize(): number {
  if (typeof window === 'undefined') return 0
  let size = 0
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      size += localStorage[key].length + key.length
    }
  }
  return size
}

function pruneOldAlerts() {
  const cutoff = Date.now() - ALERTS_RETENTION_DAYS * 24 * 60 * 60 * 1000
  const alerts = load<AlertPayload>(ALERTS_KEY)
  const pruned = alerts.filter((a) => a.timestamp >= cutoff)
  if (pruned.length < alerts.length) {
    save(ALERTS_KEY, pruned)
  }
}

function save<T>(key: string, data: T[]) {
  pruneOldAlerts()
  const size = getStorageSize()
  if (size > STORAGE_QUOTA_BYTES * 0.9) {
    // Keep only last 30 days if approaching quota
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const alerts = load<AlertPayload>(ALERTS_KEY)
    save(ALERTS_KEY, alerts.filter((a) => a.timestamp >= cutoff))
  }
  localStorage.setItem(key, JSON.stringify(data))
}

function getStorageVersion(): number {
  if (typeof window === 'undefined') return CURRENT_STORAGE_VERSION
  return parseInt(localStorage.getItem(STORAGE_VERSION_KEY) ?? '0', 10)
}

function setStorageVersion(version: number) {
  localStorage.setItem(STORAGE_VERSION_KEY, version.toString())
}

export function migrateStorage(migrations: Record<number, () => void>) {
  const currentVersion = getStorageVersion()
  for (let v = currentVersion + 1; v <= CURRENT_STORAGE_VERSION; v++) {
    if (migrations[v]) {
      migrations[v]()
    }
  }
  setStorageVersion(CURRENT_STORAGE_VERSION)
}

export function getContracts(): WatchedContract[] {
  return load<WatchedContract>(CONTRACTS_KEY)
}

export function getContract(id: string): WatchedContract | undefined {
  return getContracts().find((c) => c.id === id)
}

export function getContractByIdAndNetwork(
  contractId: string,
  network: string
): WatchedContract | undefined {
  return getContracts().find((c) => c.contract_id === contractId && c.network === network)
}

export function saveContract(contract: WatchedContract) {
  const contracts = getContracts().filter((c) => c.id !== contract.id)
  const updated = { ...contract, updated_at: Date.now() }
  save(CONTRACTS_KEY, [...contracts, updated])
}

export function deleteContract(id: string) {
  const contract = getContract(id)
  save(CONTRACTS_KEY, getContracts().filter((c) => c.id !== id))
  if (contract) {
    deleteAlerts(contract.contract_id)
  }
}

export function deleteAlerts(contractId: string) {
  const alerts = load<AlertPayload>(ALERTS_KEY)
  save(ALERTS_KEY, alerts.filter((a) => a.contract_id !== contractId))
}

export function getAlerts(contractId: string): AlertPayload[] {
  return load<AlertPayload>(ALERTS_KEY).filter(
    (a) => a.contract_id === contractId
  )
}

export function seedMockAlerts(
  contractId: string,
  network: Network,
  count = 5
): void {
  if (typeof window === 'undefined') return

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

  save(ALERTS_KEY, [...alerts, ...load<AlertPayload>(ALERTS_KEY)])
}

export function addAlert(alert: AlertPayload) {
  const alerts = load<AlertPayload>(ALERTS_KEY)
  save(ALERTS_KEY, [alert, ...alerts])
}

export function deleteAlertsByContractId(contractId: string) {
  const alerts = load<AlertPayload>(ALERTS_KEY)
  save(ALERTS_KEY, alerts.filter((a) => a.contract_id !== contractId))
}

export function getTodayAlertCount(): number {
  const start = new Date().setHours(0, 0, 0, 0)
  return load<AlertPayload>(ALERTS_KEY).filter((a) => a.timestamp >= start).length
}

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

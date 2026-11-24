import { Network } from '@/types'
import { StrKey, scValToNative, xdr } from '@stellar/stellar-sdk'

const HORIZON_DEFAULTS: Record<Network, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
  futurenet: 'https://horizon-futurenet.stellar.org',
}

const SOROBAN_DEFAULTS: Record<Network, string> = {
  mainnet: 'https://mainnet.sorobanrpc.com',
  testnet: 'https://soroban-testnet.stellar.org',
  futurenet: 'https://rpc-futurenet.stellar.org',
}

const CONTRACT_ID_FORMAT = /^C[A-Z2-7]{55}$/

/** Return an environment override only when it is a valid http(s) URL. */
function validOverride(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined
  } catch {
    return undefined
  }
}

function horizonUrl(network: Network): string {
  const specific = validOverride(
    process.env[`NEXT_PUBLIC_HORIZON_URL_${network.toUpperCase()}`]
  )
  if (specific) return specific

  // The legacy single-variable form only ever applied to testnet.
  if (network === 'testnet') {
    const legacy = validOverride(process.env.NEXT_PUBLIC_HORIZON_URL)
    if (legacy) return legacy
  }

  return HORIZON_DEFAULTS[network]
}

function sorobanRpcUrl(network: Network): string {
  const specific = validOverride(
    process.env[`NEXT_PUBLIC_SOROBAN_RPC_URL_${network.toUpperCase()}`]
  )
  if (specific) return specific

  if (network === 'testnet') {
    const legacy = validOverride(process.env.NEXT_PUBLIC_SOROBAN_RPC_URL)
    if (legacy) return legacy
  }

  return SOROBAN_DEFAULTS[network]
}

export const HORIZON_URLS: Record<Network, string> = {
  mainnet: horizonUrl('mainnet'),
  testnet: horizonUrl('testnet'),
  futurenet: horizonUrl('futurenet'),
}

export const SOROBAN_RPC_URLS: Record<Network, string> = {
  mainnet: sorobanRpcUrl('mainnet'),
  testnet: sorobanRpcUrl('testnet'),
  futurenet: sorobanRpcUrl('futurenet'),
}

export function getHorizonUrl(network: Network): string {
  return HORIZON_URLS[network]
}

export function getSorobanRpcUrl(network: Network): string {
  return SOROBAN_RPC_URLS[network]
}

export const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer'
export const STELLARCHAIN_BASE = 'https://stellarchain.io'

export type ExplorerId = 'stellar-expert' | 'stellarchain' | 'horizon'

export interface ExplorerMeta {
  id: ExplorerId
  name: string
  description: string
}

export const EXPLORERS: ExplorerMeta[] = [
  {
    id: 'stellar-expert',
    name: 'Stellar Expert',
    description: 'Rich explorer with contract and transaction details.',
  },
  {
    id: 'stellarchain',
    name: 'StellarChain',
    description: 'Alternative block explorer for the Stellar network.',
  },
  {
    id: 'horizon',
    name: 'Horizon (raw JSON)',
    description: 'View the raw Horizon API response for the transaction.',
  },
]

export const DEFAULT_EXPLORER: ExplorerId = 'stellar-expert'

export function isExplorerId(value: unknown): value is ExplorerId {
  return value === 'stellar-expert' || value === 'stellarchain' || value === 'horizon'
}

function explorerSegment(network: Network): string {
  return network === 'mainnet' ? 'public' : network
}

export function explorerTxUrl(
  network: Network,
  txHash: string,
  explorer: ExplorerId = DEFAULT_EXPLORER,
): string {
  const segment = explorerSegment(network)
  switch (explorer) {
    case 'stellarchain':
      return `${STELLARCHAIN_BASE}/${segment}/tx/${txHash}`
    case 'horizon':
      return `${HORIZON_URLS[network]}/transactions/${txHash}`
    default:
      return `${STELLAR_EXPERT_BASE}/${segment}/tx/${txHash}`
  }
}

export function explorerContractUrl(
  network: Network,
  contractId: string,
  explorer: ExplorerId = DEFAULT_EXPLORER,
): string {
  const segment = explorerSegment(network)
  switch (explorer) {
    case 'stellarchain':
      return `${STELLARCHAIN_BASE}/${segment}/contract/${contractId}`
    case 'horizon':
      return `${HORIZON_URLS[network]}/contracts/${contractId}`
    default:
      return `${STELLAR_EXPERT_BASE}/${segment}/contract/${contractId}`
  }
}

/** Abbreviate a long identifier for display. */
export function truncateId(id: string, chars = 8): string {
  if (id.length <= chars * 2 + 3) return id
  return `${id.slice(0, chars)}...${id.slice(-chars)}`
}

/** Validate a Soroban contract address using StrKey's checksum validation. */
export function isValidContractId(id: string): boolean {
  if (!CONTRACT_ID_FORMAT.test(id)) return false
  try {
    return StrKey.isValidContract(id)
  } catch {
    return false
  }
}

export function isValidAccountId(id: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(id)
  } catch {
    return false
  }
}

export type ContractIdValidationResult =
  | { valid: true }
  | { valid: false; reason: 'format' | 'checksum'; message: string }

export function validateContractId(id: string): ContractIdValidationResult {
  if (typeof id !== 'string' || !CONTRACT_ID_FORMAT.test(id)) {
    return {
      valid: false,
      reason: 'format',
      message:
        'Invalid contract ID format: expected a 56-character string starting with "C" using the base32 alphabet (A-Z, 2-7).',
    }
  }
  if (!isValidContractId(id)) {
    return {
      valid: false,
      reason: 'checksum',
      message: 'Invalid contract ID checksum: the address is well-formed but its checksum does not match.',
    }
  }
  return { valid: true }
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Soroban RPC helpers
// ---------------------------------------------------------------------------

const SOROBAN_RPC_TIMEOUT_MS = 10_000
const EVENT_RETENTION_LEDGERS = 1_000

export interface SorobanRpcError {
  code: number
  message: string
  data?: unknown
}

export async function sorobanRpc<T = unknown>(
  network: Network,
  method: string,
  params: unknown,
  timeoutMs: number = SOROBAN_RPC_TIMEOUT_MS,
): Promise<T> {
  const url = getSorobanRpcUrl(network)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Soroban RPC request timed out (${method})`)
    }
    throw err instanceof Error ? err : new Error(String(err))
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) throw new Error(`Soroban RPC HTTP error ${res.status} (${method})`)

  let json: { result?: T; error?: SorobanRpcError }
  try {
    json = await res.json()
  } catch {
    throw new Error(`Soroban RPC returned invalid JSON (${method})`)
  }

  if (json.error) {
    throw new Error(`Soroban RPC error ${json.error.code}: ${json.error.message}`)
  }
  if (json.result === undefined) {
    throw new Error(`Soroban RPC returned no result (${method})`)
  }
  return json.result
}

/** Accept both the legacy (network, id) and current (id, network) arg orders. */
function normalizeArgs(
  a: string,
  b: string
): { network: Network; contractId: string } {
  const networks = ['mainnet', 'testnet', 'futurenet']
  if (networks.includes(a)) return { network: a as Network, contractId: b }
  return { network: (networks.includes(b) ? b : 'testnet') as Network, contractId: a }
}

export interface ContractExistsResult {
  exists: boolean
  error?: string
}

export async function checkContractExists(
  first: string,
  second: string
): Promise<ContractExistsResult> {
  const { network, contractId } = normalizeArgs(first, second)
  try {
    const result = await sorobanRpc<{
      entries?: Array<{ key?: string; xdr?: string; lastModifiedLedgerSeq?: number } | null>
    }>(network, 'getLedgerEntries', { keys: [contractId] })
    const exists = (result.entries ?? []).some((entry) => entry != null)
    return { exists }
  } catch (err) {
    return { exists: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface ContractMetadata {
  wasmHash?: string
  lastModifiedLedger?: number
  isSac: boolean
}

export interface ContractMetadataResult extends ContractMetadata {
  error?: string
}

export async function fetchContractMetadata(
  first: string,
  second: string
): Promise<ContractMetadataResult> {
  const { network, contractId } = normalizeArgs(first, second)
  try {
    const result = await sorobanRpc<{
      entries?: Array<{
        key?: string
        xdr?: string
        lastModifiedLedgerSeq?: number
        val?: {
          contractData?: { val?: { executable?: { sac?: unknown; wasm?: string } } }
        }
      } | null>
    }>(network, 'getLedgerEntries', { keys: [contractId] })

    const entry = (result.entries ?? []).find((value) => value != null)
    if (!entry) return { isSac: false, error: 'Contract instance not found' }

    const executable = entry.val?.contractData?.val?.executable
    if (executable?.sac) {
      return {
        isSac: true,
        lastModifiedLedger: entry.lastModifiedLedgerSeq,
      }
    }
    if (typeof executable?.wasm === 'string') {
      return {
        isSac: false,
        wasmHash: executable.wasm,
        lastModifiedLedger: entry.lastModifiedLedgerSeq,
      }
    }

    // Fall back to decoding the XDR ledger entry when the JSON-RPC response
    // only contains the raw entry.
    if (entry.xdr) {
      try {
        const data = xdr.LedgerEntryData.fromXDR(entry.xdr, 'base64')
        const instance = data.contractData().val().instance()
        const executableXdr = instance.executable()
        if (executableXdr.switch().name === 'contractExecutableStellarAsset') {
          return { isSac: true, lastModifiedLedger: entry.lastModifiedLedgerSeq }
        }
        if (executableXdr.switch().name === 'contractExecutableWasm') {
          return {
            isSac: false,
            wasmHash: Buffer.from(executableXdr.wasmHash()).toString('hex'),
            lastModifiedLedger: entry.lastModifiedLedgerSeq,
          }
        }
      } catch {
        // Ignore malformed XDR and return the empty metadata below.
      }
    }

    return { isSac: false, lastModifiedLedger: entry.lastModifiedLedgerSeq }
  } catch (err) {
    return { isSac: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export interface ContractEvent {
  id: string
  type: string
  topics: unknown[]
  value: unknown
  ledger: number
  txHash: string
  contractId: string
}

/**
 * The events response is array-like so callers can iterate it directly, while
 * also exposing the legacy `events`, `latestLedger`, and `error` fields.
 */
export type ContractEventsResult = ContractEvent[] & {
  events: ContractEvent[]
  latestLedger: number | null
  error?: string
}

function eventsResult(
  events: ContractEvent[],
  latestLedger: number | null,
  error?: string
): ContractEventsResult {
  return Object.assign(events, {
    events: [...events],
    latestLedger,
    ...(error ? { error } : {}),
  })
}

export async function fetchContractEvents(
  first: string,
  second: string,
  limit = 20
): Promise<ContractEventsResult> {
  const { network, contractId } = normalizeArgs(first, second)
  try {
    const result = await sorobanRpc<{
      events?: Array<{
        id?: string
        type?: string
        ledger?: number
        contractId?: string
        txHash?: string
        topic?: string[]
        value?: unknown
      }>
      latestLedger?: number
    }>(network, 'getEvents', {
      startLedger: Math.max(1, 5000 - EVENT_RETENTION_LEDGERS),
      filters: [{ type: 'contract', contractIds: [contractId] }],
      pagination: { limit },
    })

    const latestLedger =
      typeof result.latestLedger === 'number' ? result.latestLedger : null
    const events = (result.events ?? []).map((raw) => ({
      id: raw.id ?? '',
      type: raw.type ?? 'contract',
      topics: (raw.topic ?? []).map((topic) => {
        try {
          // Most test doubles and newer RPC payloads expose already-decoded
          // topic strings; the mockable helper handles those directly.
          return scValToNative(topic as never)
        } catch {
          try {
            return scValToNative(xdr.ScVal.fromXDR(topic, 'base64'))
          } catch {
            return topic
          }
        }
      }),
      value: raw.value,
      ledger: raw.ledger ?? 0,
      txHash: raw.txHash ?? '',
      contractId: raw.contractId ?? contractId,
    }))

    return eventsResult(events, latestLedger)
  } catch (err) {
    return eventsResult([], null, err instanceof Error ? err.message : String(err))
  }
}

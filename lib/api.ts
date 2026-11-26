import { HORIZON_URLS, isValidUrl } from '@/lib/stellar'
import { env } from '@/lib/env'
import { getApiKey } from '@/lib/storage'
import type { Network } from '@/types'

const BASE_URL = env.NEXT_PUBLIC_API_URL

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headersRecord: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headersRecord[key] = value
      })
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headersRecord[key] = value
      })
    } else {
      Object.assign(headersRecord, options.headers)
    }
  }
  const apiKey = getApiKey()
  if (apiKey) {
    headersRecord['Authorization'] = `Bearer ${apiKey}`
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: headersRecord,
    })
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('Network offline — check your internet connection')
    }
    throw err
  }

  if (!res.ok) {
    const text = await res.text()
    let message = `HTTP ${res.status}`
    if (text) {
      try {
        const body = JSON.parse(text)
        message = body?.message || body?.error || text
      } catch {
        message = text
      }
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

interface SorobanRpcResponse<T> {
  result?: T
  error?: { code?: number; message?: string; data?: unknown }
}

async function sorobanRpcCall<T>(
  network: Network,
  method: string,
  params: unknown
): Promise<T> {
  const url = SOROBAN_RPC_URLS[network]
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  })

  if (!res.ok) {
    throw new Error(`Soroban RPC HTTP ${res.status}`)
  }

  const body = (await res.json()) as SorobanRpcResponse<T>
  if (body.error) {
    throw new Error(body.error.message || `Soroban RPC error ${body.error.code}`)
  }
  if (body.result === undefined) {
    throw new Error('Soroban RPC returned no result')
  }
  return body.result
}

export interface ContractInstanceInfo {
  liveUntilLedgerSeq: number
}

/**
 * Fetches the contract instance entry from Soroban RPC and returns its
 * `liveUntilLedgerSeq` (the ledger sequence at which the instance expires).
 */
export async function fetchContractInstance(
  contractId: string,
  network: Network = 'testnet'
): Promise<ContractInstanceInfo> {
  const result = await sorobanRpcCall<{
    entries?: Array<{ liveUntilLedgerSeq?: number | string } | null>
  }>(network, 'getLedgerEntries', {
    keys: [
      {
        type: 'contractData',
        contract: contractId,
        key: 'instance',
        durability: 'persistent',
      },
    ],
  })

  const entry = result.entries?.find((e) => e != null)
  if (!entry || entry.liveUntilLedgerSeq === undefined) {
    throw new Error('Contract instance entry not found')
  }

  return { liveUntilLedgerSeq: Number(entry.liveUntilLedgerSeq) }
}

const contractFunctionsCache = new Map<string, string[]>()

/**
 * Fetches the list of exported function names from a contract's Soroban
 * spec, shared by both the FunctionCalled and AdminFunctionCalled rule
 * inputs in RuleBuilder (issue #626). Results are cached per
 * `network:contract_id` so re-opening the rule builder for the same
 * contract doesn't re-fetch. Falls back to an empty list (plain text
 * entry) if the spec can't be read, instead of throwing.
 */
export async function fetchContractFunctions(
  contractId: string,
  network: Network = 'testnet'
): Promise<string[]> {
  const cacheKey = `${network}:${contractId}`
  const cached = contractFunctionsCache.get(cacheKey)
  if (cached) return cached

  try {
    const { Contract, rpc } = await import('@stellar/stellar-sdk')
    const server = new rpc.Server(SOROBAN_RPC_URLS[network])
    const contract = new Contract(contractId)
    // getContractSpec parses the WASM's exported contractspecv0 section
    // into function/type definitions.
    const spec = await (server as unknown as {
      getContractSpec: (c: unknown) => Promise<{ funcs: () => Array<{ name: () => string }> }>
    }).getContractSpec(contract)
    const names = spec.funcs().map((f) => f.name()).filter(Boolean)
    contractFunctionsCache.set(cacheKey, names)
    return names
  } catch {
    contractFunctionsCache.set(cacheKey, [])
    return []
  }
}

/**
 * Checks whether a contract instance exists on the given network by
 * querying Soroban RPC for its ledger entry. Used to validate a
 * contract_id before switching a watched contract to a new network
 * (see issue #627).
 */
export async function contractExistsOnNetwork(
  contractId: string,
  network: Network
): Promise<boolean> {
  try {
    await fetchContractInstance(contractId, network)
    return true
  } catch {
    return false
  }
}

/**
 * Invokes the token contract's `decimals()` function via Soroban RPC
 * simulation and returns the token's decimal precision.
 */
export async function fetchTokenDecimals(
  tokenContractId: string,
  network: Network = 'testnet'
): Promise<number> {
  const result = await sorobanRpcCall<{
    results?: Array<{ xdr?: string; error?: string } | null>
  }>(network, 'simulateTransaction', {
    transaction: {
      // Minimal invoke host function for decimals()
      // Callers may need to supply a fully-built transaction XDR in future.
      contractId: tokenContractId,
      function: 'decimals',
      args: [],
    },
  })

  const first = result.results?.[0]
  if (!first || first.error) {
    throw new Error(first?.error || 'Failed to simulate decimals() call')
  }
  if (!first.xdr) {
    throw new Error('decimals() returned no value')
  }

  // The XDR encodes a ScVal u32; decode the trailing 4 bytes as a big-endian uint.
  const hex = first.xdr.replace(/^0x/, '')
  const bytes = hex.match(/.{1,2}/g) ?? []
  if (bytes.length < 4) {
    throw new Error('decimals() returned an unexpected value')
  }
  const tail = bytes.slice(-4)
  const value =
    ((parseInt(tail[0], 16) << 24) |
      (parseInt(tail[1], 16) << 16) |
      (parseInt(tail[2], 16) << 8) |
      parseInt(tail[3], 16)) >>>
    0
  return value
}

export interface TestWebhookResult {
  status: number
  ok: boolean
  /** First 200 chars of the response body, for display purposes. */
  bodyPreview: string
}

export async function sendTestWebhook(
  webhookUrl: string,
  contractId: string,
  network: Network = 'testnet',
  signal?: AbortSignal,
  signers?: string[]
): Promise<{ status: number; ok: boolean }> {
  if (!webhookUrl || !isValidUrl(webhookUrl)) {
    throw new Error('Invalid webhook URL')
  }

  const payload = {
    label: 'Test Alert',
    contract_id: contractId,
    network,
    rule_triggered: 'AnyTransaction',
    transaction_hash:
      'TEST_HASH_0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: Date.now(),
    horizon_link: `${HORIZON_URLS[network]}/transactions/test`,
  }

  // Callers pass their own AbortSignal; without one, fall back to a 10s timeout.
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let requestSignal = signal

  if (!requestSignal) {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), 10000)
    requestSignal = controller.signal
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: requestSignal,
    })
    let bodyPreview = ''
    try {
      const text = await res.text()
      bodyPreview = text.slice(0, 200)
    } catch {
      bodyPreview = ''
    }
    return { status: res.status, ok: res.ok, bodyPreview }
  } catch (error) {
    const err = error as { name?: string }
    if (err?.name === 'AbortError') {
      throw new Error('Webhook request timed out')
    }
    throw error
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }
}

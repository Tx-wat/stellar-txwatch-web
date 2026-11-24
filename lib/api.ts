import { HORIZON_URLS, SOROBAN_RPC_URLS, isValidUrl } from '@/lib/stellar'
import { getApiKey } from '@/lib/storage'
import type { Network, WatchedContract } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

/** Returns true when the backend API is configured. */
export function isApiConfigured(): boolean {
  return BASE_URL.length > 0
}

/**
 * Returns authentication headers when an API key has been saved.
 * When `NEXT_PUBLIC_API_URL` is configured this header is included on
 * every request made via `apiFetch`.
 */
function getAuthHeaders(): Record<string, string> {
  const key = getApiKey()
  return key ? { Authorization: `Bearer ${key}` } : {}
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers)
  if (!headers.has('content-type')) {
    headers.set('Content-Type', 'application/json')
  }
  for (const [name, value] of Object.entries(getAuthHeaders())) {
    headers.set(name, value)
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

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

/** Fetch all contracts from the backend API (GET /contracts). */
export async function fetchContractsFromApi(): Promise<WatchedContract[]> {
  return apiFetch<WatchedContract[]>('/contracts')
}

/** Save (upsert) a contract to the backend API (POST /contracts). */
export async function saveContractToApi(contract: WatchedContract): Promise<void> {
  await apiFetch<WatchedContract>('/contracts', {
    method: 'POST',
    body: JSON.stringify(contract),
  })
}

/** Delete a contract from the backend API (DELETE /contracts/:id). */
export async function deleteContractFromApi(id: string): Promise<void> {
  await apiFetch<void>(`/contracts/${id}`, { method: 'DELETE' })
}

/**
 * Pings the txwatch-core health endpoint with the stored API key.
 * Falls back to the root path when /health is not exposed.
 */
export async function testApiConnection(): Promise<{
  ok: boolean
  status: number
  message: string
}> {
  if (!BASE_URL) {
    return {
      ok: false,
      status: 0,
      message: 'NEXT_PUBLIC_API_URL is not configured',
    }
  }

  try {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    for (const [name, value] of Object.entries(getAuthHeaders())) {
      headers.set(name, value)
    }

    const res = await fetch(`${BASE_URL}/health`, { headers })
    const target = res.status === 404 ? await fetch(`${BASE_URL}/`, { headers }) : res
    const ok = target.ok
    return {
      ok,
      status: target.status,
      message: ok
        ? `Connected (${target.status})`
        : res.status === 404
          ? `Server reachable but returned ${target.status}`
          : `Server returned ${target.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  }
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
  return (
    ((parseInt(tail[0], 16) << 24) |
      (parseInt(tail[1], 16) << 16) |
      (parseInt(tail[2], 16) << 8) |
      parseInt(tail[3], 16)) >>>
    0
  )
}

export interface TestWebhookResult {
  status: number
  ok: boolean
}

/**
 * Sends a mock alert payload to a webhook URL so users can verify delivery
 * before going live. The fourth argument accepts either a timeout in
 * milliseconds or an AbortSignal supplied by the caller.
 */
export async function sendTestWebhook(
  webhookUrl: string,
  contractId: string,
  network: Network = 'testnet',
  timeoutOrSignal: number | AbortSignal = 10000,
  signers?: string[]
): Promise<TestWebhookResult> {
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
    ...(signers && signers.length > 0 ? { signers } : {}),
  }

  let signal: AbortSignal | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  if (typeof timeoutOrSignal === 'number') {
    const controller = new AbortController()
    timeoutId = setTimeout(() => controller.abort(), timeoutOrSignal)
    signal = controller.signal
  } else {
    signal = timeoutOrSignal
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
    if (!res.ok) {
      throw new Error(`Webhook returned ${res.status}`)
    }
    return { status: res.status, ok: res.ok }
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

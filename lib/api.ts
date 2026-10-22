import { HORIZON_URLS, isValidUrl } from '@/lib/stellar'
import type { Network } from '@/types'

const BASE_URL = env.NEXT_PUBLIC_API_URL

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
  const value =
    ((parseInt(tail[0], 16) << 24) |
      (parseInt(tail[1], 16) << 16) |
      (parseInt(tail[2], 16) << 8) |
      parseInt(tail[3], 16)) >>>
    0
  return value
}

export async function sendTestWebhook(
  webhookUrl: string,
  contractId: string,
  network: Network = 'testnet',
  timeoutMs = 10000
): Promise<void> {
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

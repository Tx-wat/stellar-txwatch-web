import { HORIZON_URLS } from '@/lib/stellar'
import type { Network } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const headers = new Headers(options?.headers)
  if (!headers.has('content-type')) {
    headers.set('Content-Type', 'application/json')
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

export async function sendTestWebhook(
  webhookUrl: string,
  contractId: string,
  network: Network = 'testnet',
  signal?: AbortSignal
): Promise<{ status: number; ok: boolean }> {
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
  }
}

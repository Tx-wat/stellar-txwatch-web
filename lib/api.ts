const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

import { HORIZON_URLS } from '@/lib/stellar'
import { Network } from '@/types'

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
    transaction_hash: 'TEST_HASH_0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: Date.now(),
    horizon_link: `${HORIZON_URLS[network]}/transactions/test`,
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
  return { status: res.status, ok: res.ok }
}

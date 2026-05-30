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

export async function sendTestWebhook(
  webhookUrl: string,
  contractId: string,
  signal?: AbortSignal
): Promise<void> {
  const payload = {
    label: 'Test Alert',
    contract_id: contractId,
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: 'TEST_HASH_0000000000000000000000000000000000000000000000000000000000000000',
    timestamp: Date.now(),
    horizon_link: `https://horizon-testnet.stellar.org/transactions/test`,
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) throw new Error(`Webhook returned ${res.status}`)
}

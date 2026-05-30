import { apiFetch, sendTestWebhook } from '@/lib/api'

global.fetch = jest.fn()

describe('apiFetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches successfully and merges headers', async () => {
    const mockData = { id: 1 }
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await apiFetch('/test', {
      headers: { 'X-Custom': 'value' },
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        }),
      })
    )
    expect(result).toEqual(mockData)
  })

  it('throws error on non-OK response with text', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
    })

    await expect(apiFetch('/test')).rejects.toThrow('Bad request')
  })

  it('throws error on non-OK response without text', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    })

    await expect(apiFetch('/test')).rejects.toThrow('HTTP 500')
  })
})

describe('sendTestWebhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends webhook with correct payload structure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({ ok: true })

    await sendTestWebhook('https://example.com/webhook', 'CBCDEF')

    const call = (global.fetch as jest.Mock).mock.calls[0]
    const payload = JSON.parse(call[1].body)

    expect(payload).toMatchObject({
      label: 'Test Alert',
      contract_id: 'CBCDEF',
      network: 'testnet',
      rule_triggered: 'AnyTransaction',
    })
    expect(payload.transaction_hash).toMatch(/^TEST_HASH/)
  })

  it('throws error on webhook failure', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    })

    await expect(sendTestWebhook('https://example.com/webhook', 'CBCDEF')).rejects.toThrow(
      'Webhook returned 404'
    )
  })
})

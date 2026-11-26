import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiFetch, sendTestWebhook } from '@/lib/api'
import { setApiKey, clearApiKey } from '@/lib/storage'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches successfully and merges headers', async () => {
    const mockData = { id: 1 }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiFetch('/test', {
      headers: { 'X-Custom': 'value' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    )
    // Verify the actual header values via the Headers object
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const headers: Headers = call[1].headers
    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('X-Custom')).toBe('value')
    expect(result).toEqual(mockData)
  })

  it('throws error on non-OK response with text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: () => Promise.resolve('Bad request'),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/test')).rejects.toThrow('Bad request')
  })

  it('throws error on non-OK response without text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(''),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/test')).rejects.toThrow('HTTP 500')
  })

  it('attaches an Authorization header when an API key is stored', async () => {
    clearApiKey()
    setApiKey('secret-key')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/test')

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].headers['Authorization']).toBe('Bearer secret-key')
    clearApiKey()
  })

  it('omits the Authorization header when no API key is stored', async () => {
    clearApiKey()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await apiFetch('/test')

    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(call[1].headers['Authorization']).toBeUndefined()
  })
})

describe('sendTestWebhook', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('resolves with status/ok/bodyPreview on success (200) and includes network parameter in payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('{"received":true}'),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendTestWebhook('https://example.com/webhook', 'CBCDEF12345', 'mainnet')
    expect(result).toEqual({ status: 200, ok: true, bodyPreview: '{"received":true}' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, options] = fetchMock.mock.calls[0]
    expect(calledUrl).toBe('https://example.com/webhook')
    expect(options.method).toBe('POST')

    const body = JSON.parse(options.body)
    expect(body.contract_id).toBe('CBCDEF12345')
    expect(body.network).toBe('mainnet')
    expect(body.label).toBe('Test Alert')
    expect(body.rule_triggered).toBe('AnyTransaction')
    expect(body.horizon_link).toContain('transactions/test')
  })

  it('resolves with ok: false and the status/body on an HTTP error response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendTestWebhook('https://example.com/webhook', 'CBCDEF12345')
    expect(result).toEqual({ status: 500, ok: false, bodyPreview: 'Internal Server Error' })
  })

  it('truncates the body preview to 200 characters', async () => {
    const longBody = 'x'.repeat(500)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(longBody),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendTestWebhook('https://example.com/webhook', 'CBCDEF12345')
    expect(result.bodyPreview).toHaveLength(200)
  })

  it('throws "Webhook request timed out" on AbortError timeout', async () => {
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    const fetchMock = vi.fn().mockRejectedValue(abortError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      sendTestWebhook('https://example.com/webhook', 'CBCDEF12345')
    ).rejects.toThrow('Webhook request timed out')
  })

  it('re-throws network failure when fetch rejects', async () => {
    const networkError = new TypeError('Failed to fetch')
    const fetchMock = vi.fn().mockRejectedValue(networkError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      sendTestWebhook('https://example.com/webhook', 'CBCDEF12345')
    ).rejects.toThrow('Failed to fetch')
  })

  it('throws validation error on invalid or empty webhook URL before fetch is called', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(sendTestWebhook('', 'CBCDEF12345')).rejects.toThrow('Invalid webhook URL')
    await expect(sendTestWebhook('not-a-url', 'CBCDEF12345')).rejects.toThrow('Invalid webhook URL')
    await expect(sendTestWebhook('ftp://example.com', 'CBCDEF12345')).rejects.toThrow('Invalid webhook URL')

    expect(fetchMock).not.toHaveBeenCalled()
  })
})

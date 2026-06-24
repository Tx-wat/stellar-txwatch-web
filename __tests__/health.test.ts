import { vi, describe, it, expect, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'

global.fetch = vi.fn()

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000'
  })

  it('returns healthy (200) when both deps ok', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: true, status: 200 } as Response)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.dependencies.db.status).toBe('ok')
    expect(body.dependencies.redis.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })

  it('returns unhealthy (503) when both deps fail', async () => {
    vi.mocked(global.fetch).mockResolvedValue({ ok: false, status: 503 } as Response)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.status).toBe('unhealthy')
    expect(body.dependencies.db.status).toBe('error')
    expect(body.dependencies.redis.status).toBe('error')
  })

  it('returns degraded (207) when only one dep fails', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 503 } as Response)

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(207)
    expect(body.status).toBe('degraded')
  })

  it('returns unknown status when API_URL not configured', async () => {
    process.env.NEXT_PUBLIC_API_URL = ''

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('healthy')
    expect(body.dependencies.db.status).toBe('unknown')
    expect(body.dependencies.redis.status).toBe('unknown')
  })

  it('handles fetch errors gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Connection refused'))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(503)
    expect(body.dependencies.db.status).toBe('error')
    expect(body.dependencies.db.error).toBe('Connection refused')
  })
})

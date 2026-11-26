/**
 * Tests for getStorageUsage — the helper that powers the settings-page
 * storage usage indicator (issue #596).
 */
import { getStorageUsage } from '@/lib/storage'
import { STORAGE_QUOTA_BYTES } from '@/lib/constants'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    get length() {
      return Object.keys(store).length
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
})()

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

beforeEach(() => {
  localStorageMock.clear()
})

describe('getStorageUsage', () => {
  it('returns zero used bytes when localStorage is empty', () => {
    const { usedBytes } = getStorageUsage()
    expect(usedBytes).toBe(0)
  })

  it('returns the configured quota', () => {
    const { quotaBytes } = getStorageUsage()
    expect(quotaBytes).toBe(STORAGE_QUOTA_BYTES)
  })

  it('accounts for stored key/value pairs', () => {
    localStorageMock.setItem('foo', 'bar') // 3 + 3 = 6 chars → 12 bytes
    const { usedBytes } = getStorageUsage()
    // usedBytes = (key.length + value.length) * 2 = 12
    expect(usedBytes).toBe(12)
  })

  it('increases when more data is stored', () => {
    localStorageMock.setItem('key1', 'value1')
    const { usedBytes: before } = getStorageUsage()

    localStorageMock.setItem('key2', 'value2')
    const { usedBytes: after } = getStorageUsage()

    expect(after).toBeGreaterThan(before)
  })

  it('usedBytes is below quotaBytes under normal conditions', () => {
    localStorageMock.setItem('txwatch_contracts', JSON.stringify([{ id: 'c1' }]))
    const { usedBytes, quotaBytes } = getStorageUsage()
    expect(usedBytes).toBeLessThan(quotaBytes)
  })

  it('reports pct >= 80 when storage is near-full', () => {
    // Fill storage to just over 80 % of quota.
    // quotaBytes = 5 * 1024 * 1024 (5 MB). usedBytes = chars * 2.
    // We need usedBytes / quotaBytes >= 0.80, i.e. chars >= quotaBytes * 0.80 / 2.
    const targetChars = Math.ceil((STORAGE_QUOTA_BYTES * 0.80) / 2) + 1
    const bigValue = 'x'.repeat(targetChars)
    localStorageMock.setItem('big', bigValue)

    const { usedBytes, quotaBytes } = getStorageUsage()
    const pct = (usedBytes / quotaBytes) * 100
    expect(pct).toBeGreaterThanOrEqual(80)
  })
})

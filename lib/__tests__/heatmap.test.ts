import { describe, it, expect, beforeEach } from 'vitest'
import { getDailyAlertCounts, addAlert } from '../storage'
import { AlertPayload } from '@/types'

// LocalStorage shim for node environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value
  },
  removeItem: (key: string) => {
    delete store[key]
  },
  clear: () => {
    Object.keys(store).forEach((k) => delete store[k])
  },
  get length() {
    return Object.keys(store).length
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true })

function makeAlert(overrides: Partial<AlertPayload> = {}): AlertPayload {
  return {
    label: 'Test Alert',
    contract_id: 'C_HEATMAP_TEST',
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: 'tx_hash_123',
    timestamp: Date.now(),
    horizon_link: 'https://horizon-testnet.stellar.org',
    ...overrides,
  }
}

describe('getDailyAlertCounts (issue #252)', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('returns exactly 30 days of daily counts by default', () => {
    const counts = getDailyAlertCounts('C_HEATMAP_TEST')
    expect(counts).toHaveLength(30)
    expect(counts.every((c) => c.count === 0)).toBe(true)
  })

  it('supports custom days range', () => {
    const counts = getDailyAlertCounts('C_HEATMAP_TEST', 14)
    expect(counts).toHaveLength(14)
  })

  it('accurately counts alerts occurring today', () => {
    const alert1 = makeAlert({ contract_id: 'C_HEATMAP_TEST', timestamp: Date.now() })
    const alert2 = makeAlert({ contract_id: 'C_HEATMAP_TEST', timestamp: Date.now() })
    addAlert(alert1)
    addAlert(alert2)

    const counts = getDailyAlertCounts('C_HEATMAP_TEST')
    expect(counts[counts.length - 1].count).toBe(2)
  })

  it('accurately groups alerts across past days', () => {
    const now = Date.now()
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000

    const alerts: AlertPayload[] = [
      makeAlert({ timestamp: now }),
      makeAlert({ timestamp: now }),
      makeAlert({ timestamp: oneDayAgo }),
      makeAlert({ timestamp: threeDaysAgo }),
      makeAlert({ timestamp: threeDaysAgo }),
      makeAlert({ timestamp: threeDaysAgo }),
    ]

    const counts = getDailyAlertCounts(alerts, 30)
    expect(counts).toHaveLength(30)
    // today is at index 29
    expect(counts[29].count).toBe(2)
    // 1 day ago is at index 28
    expect(counts[28].count).toBe(1)
    // 3 days ago is at index 26
    expect(counts[26].count).toBe(3)
  })

  it('filters by contractId when querying storage', () => {
    addAlert(makeAlert({ contract_id: 'CONTRACT_1', timestamp: Date.now() }))
    addAlert(makeAlert({ contract_id: 'CONTRACT_2', timestamp: Date.now() }))

    const counts1 = getDailyAlertCounts('CONTRACT_1')
    expect(counts1[counts1.length - 1].count).toBe(1)

    const counts2 = getDailyAlertCounts('CONTRACT_2')
    expect(counts2[counts2.length - 1].count).toBe(1)

    const counts3 = getDailyAlertCounts('CONTRACT_OTHER')
    expect(counts3[counts3.length - 1].count).toBe(0)
  })

  it('handles empty alerts array gracefully', () => {
    const counts = getDailyAlertCounts([], 30)
    expect(counts).toHaveLength(30)
    expect(counts.reduce((sum, d) => sum + d.count, 0)).toBe(0)
  })
})

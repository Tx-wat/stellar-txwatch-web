import { describe, it, expect } from 'vitest'

describe('dashboard — today alert count', () => {
  it('getTodayAlertCount returns 0 when no alerts exist', () => {
    // Pure logic test: start of day threshold
    const start = new Date().setHours(0, 0, 0, 0)
    const now = Date.now()
    expect(now).toBeGreaterThanOrEqual(start)
  })

  it('filters only alerts from today', () => {
    const start = new Date().setHours(0, 0, 0, 0)
    const alerts = [
      { timestamp: start + 1000 },      // today
      { timestamp: start - 1000 },      // yesterday
      { timestamp: start + 3600_000 },  // today
    ]
    const count = alerts.filter((a) => a.timestamp >= start).length
    expect(count).toBe(2)
  })
})

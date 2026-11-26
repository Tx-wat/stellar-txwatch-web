import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import AlertHeatmap from '../components/AlertHeatmap'
import { getDailyAlertCounts } from '@/lib/storage'
import { AlertPayload } from '@/types'

function makeAlert(daysAgo: number): AlertPayload {
  const timestamp = Date.now() - daysAgo * 24 * 60 * 60 * 1000
  return {
    label: 'Test Alert',
    contract_id: 'C_HEATMAP_TOOLTIP',
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: `tx_${daysAgo}`,
    timestamp,
    horizon_link: 'https://horizon-testnet.stellar.org',
  }
}

/**
 * Simulates a non-UTC timezone by overriding Date.prototype.getFullYear,
 * getMonth, getDate, and setHours to shift every local-date calculation by
 * `offsetHours`.  The UTC methods are left untouched so that the fixed
 * getDailyAlertCounts / formatTooltipDate implementations (which only use UTC
 * APIs) are unaffected.
 */
function withTimezoneOffset(offsetHours: number, fn: () => void) {
  const OrigDate = globalThis.Date

  // A thin Date subclass that shifts local-time methods by `offsetHours`.
  class ShiftedDate extends OrigDate {
    constructor(...args: ConstructorParameters<typeof OrigDate>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      super(...(args as [any]))
    }

    getFullYear() { return new OrigDate(+this + offsetHours * 3_600_000).getUTCFullYear() }
    getMonth()    { return new OrigDate(+this + offsetHours * 3_600_000).getUTCMonth() }
    getDate()     { return new OrigDate(+this + offsetHours * 3_600_000).getUTCDate() }
    getHours()    { return new OrigDate(+this + offsetHours * 3_600_000).getUTCHours() }

    // setHours(0,0,0,0) is used to anchor "today" in non-UTC code paths.
    setHours(h: number, m = 0, s = 0, ms = 0) {
      const shifted = new OrigDate(+this + offsetHours * 3_600_000)
      shifted.setUTCHours(h, m, s, ms)
      const result = +shifted - offsetHours * 3_600_000
      this.setTime(result)
      return result
    }
  }

  // Also patch Date.now() – not needed here but keeps the env consistent.
  const origNow = OrigDate.now
  ShiftedDate.now = origNow

  // @ts-expect-error – intentional global override for test isolation
  globalThis.Date = ShiftedDate
  try {
    fn()
  } finally {
    globalThis.Date = OrigDate
  }
}

describe('AlertHeatmap UTC timezone correctness (issue #592)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('places a late-UTC-night alert on the correct UTC day, not the next day', () => {
    // Build a timestamp that is 23:30 UTC "yesterday" (relative to now).
    // In UTC+14 that would be 13:30 "today" local — a buggy local-date
    // implementation would bucket it as today (the wrong day).
    const nowUtc = new Date()
    // Yesterday midnight UTC
    const yesterdayMidnightUtc = Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      nowUtc.getUTCDate() - 1
    )
    // 23:30 UTC yesterday
    const at2330Utc = yesterdayMidnightUtc + 23 * 3600_000 + 30 * 60_000
    const expectedDate = new Date(yesterdayMidnightUtc).toISOString().slice(0, 10)

    const alertAt2330Utc: AlertPayload = {
      label: 'tz test',
      contract_id: 'C_TZ',
      network: 'testnet',
      rule_triggered: 'AnyTransaction',
      transaction_hash: 'tx_tz',
      timestamp: at2330Utc,
      horizon_link: '',
    }

    // UTC+14: 23:30 UTC yesterday = 13:30 local today.
    // A buggy local-date path would put the alert in today's bucket instead of yesterday's.
    withTimezoneOffset(+14, () => {
      const counts = getDailyAlertCounts([alertAt2330Utc], 30)
      const yesterdayBucket = counts.find((c: { date: string }) => c.date === expectedDate)
      expect(yesterdayBucket, `Expected bucket for ${expectedDate}`).toBeTruthy()
      expect(yesterdayBucket!.count).toBe(1)
      // Today's bucket must be 0
      const todayDate = new Date(yesterdayMidnightUtc + 86400_000).toISOString().slice(0, 10)
      const todayBucket = counts.find((c: { date: string }) => c.date === todayDate)
      expect(todayBucket?.count ?? 0).toBe(0)
    })
  })

  it('renders today\'s cell with the right count in a UTC+14 environment', () => {
    // In UTC+14 the local date can be a full day ahead of UTC.  The heatmap
    // must still label cells by UTC date so the counts are consistent.
    withTimezoneOffset(+14, () => {
      // Create three alerts at the current UTC instant.
      const now = Date.now()
      const alerts: AlertPayload[] = Array.from({ length: 3 }, (_, i) => ({
        label: 'tz',
        contract_id: 'C_TZ2',
        network: 'testnet',
        rule_triggered: 'AnyTransaction',
        transaction_hash: `tx_tz2_${i}`,
        timestamp: now,
        horizon_link: '',
      }))
      render(<AlertHeatmap alerts={alerts} days={30} />)
      const cells = screen.getAllByRole('gridcell')
      const todayCell = cells[cells.length - 1]
      expect(todayCell).toHaveAttribute('title', expect.stringContaining('3 alerts'))
    })
  })
})

describe('AlertHeatmap tooltip (issue #628)', () => {
  it('shows an accessible title attribute with the exact daily count', () => {
    const alerts = [makeAlert(0), makeAlert(0), makeAlert(0)]
    render(<AlertHeatmap alerts={alerts} days={30} />)
    const cells = screen.getAllByRole('gridcell')
    const today = cells[cells.length - 1]
    expect(today).toHaveAttribute('title', expect.stringContaining('3 alerts'))
    expect(today).toHaveAttribute('aria-label', expect.stringContaining('3 alerts'))
  })

  it('renders a hover tooltip with the date and count on focus/hover', () => {
    const alerts = [makeAlert(0)]
    render(<AlertHeatmap alerts={alerts} days={30} />)
    const cells = screen.getAllByRole('gridcell')
    const today = cells[cells.length - 1]
    fireEvent.mouseEnter(today)
    expect(screen.getAllByText('1 alert').length).toBeGreaterThanOrEqual(1)
    fireEvent.mouseLeave(today)
  })

  it('shows zero-count tooltip for days with no alerts', () => {
    render(<AlertHeatmap alerts={[]} days={30} />)
    const cells = screen.getAllByRole('gridcell')
    expect(cells[0]).toHaveAttribute('title', expect.stringContaining('0 alerts'))
  })
})

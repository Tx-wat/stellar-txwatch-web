import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatDate, formatDateTime, formatRuleSummary } from '../format'
import { truncateId } from '../stellar'
import { AlertRule } from '@/types'

const SAMPLE_TS = Date.UTC(2026, 4, 29, 14, 30, 0)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('formatDate', () => {
  it('formats a valid timestamp as a locale date string', () => {
    const result = formatDate(SAMPLE_TS)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toBe(new Date(SAMPLE_TS).toLocaleDateString())
  })

  it('uses the locale date formatting API', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleDateString')
    formatDate(SAMPLE_TS)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('formats the zero timestamp without throwing', () => {
    const result = formatDate(0)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toBe(new Date(0).toLocaleDateString())
  })

  it('formats a pre-epoch timestamp without throwing', () => {
    const ts = Date.UTC(1960, 0, 1)
    expect(formatDate(ts)).toBe(new Date(ts).toLocaleDateString())
  })
})

describe('formatDateTime', () => {
  it('formats a valid timestamp as a locale date+time string', () => {
    const result = formatDateTime(SAMPLE_TS)
    expect(typeof result).toBe('string')
    expect(result).toBe(new Date(SAMPLE_TS).toLocaleString())
  })

  it('uses the locale date+time formatting API', () => {
    const spy = vi.spyOn(Date.prototype, 'toLocaleString')
    formatDateTime(SAMPLE_TS)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('includes more detail than formatDate (adds the time component)', () => {
    expect(formatDateTime(SAMPLE_TS).length).toBeGreaterThan(
      formatDate(SAMPLE_TS).length
    )
  })

  it('formats the zero timestamp without throwing', () => {
    expect(formatDateTime(0)).toBe(new Date(0).toLocaleString())
  })
})

describe('formatRuleSummary', () => {
  it('formats LargeTransfer with a threshold', () => {
    const rule: AlertRule = { type: 'LargeTransfer', threshold_xlm: 1000 }
    expect(formatRuleSummary(rule)).toBe('>= 1000 XLM')
  })

  it('formats LargeTransfer with a zero threshold', () => {
    const rule: AlertRule = { type: 'LargeTransfer', threshold_xlm: 0 }
    expect(formatRuleSummary(rule)).toBe('>= 0 XLM')
  })

  it('formats FunctionCalled with a function name', () => {
    const rule: AlertRule = { type: 'FunctionCalled', function_name: 'transfer' }
    expect(formatRuleSummary(rule)).toBe('transfer')
  })

  it('falls back to "function" when FunctionCalled omits function_name', () => {
    const rule: AlertRule = { type: 'FunctionCalled' }
    expect(formatRuleSummary(rule)).toBe('function')
  })

  it('formats AdminFunctionCalled with function names', () => {
    const rule: AlertRule = {
      type: 'AdminFunctionCalled',
      function_names: ['set_admin', 'upgrade'],
    }
    expect(formatRuleSummary(rule)).toBe('set_admin, upgrade')
  })

  it('falls back to "admin functions" when function_names is undefined', () => {
    const rule: AlertRule = { type: 'AdminFunctionCalled' }
    expect(formatRuleSummary(rule)).toBe('admin functions')
  })

  it('falls back to "admin functions" when function_names is empty', () => {
    const rule: AlertRule = { type: 'AdminFunctionCalled', function_names: [] }
    expect(formatRuleSummary(rule)).toBe('admin functions')
  })

  it('returns an empty string for AnyTransaction', () => {
    const rule: AlertRule = { type: 'AnyTransaction' }
    expect(formatRuleSummary(rule)).toBe('')
  })

  it('returns an empty string for TransactionFailed', () => {
    const rule: AlertRule = { type: 'TransactionFailed' }
    expect(formatRuleSummary(rule)).toBe('')
  })

  it('covers every AlertRuleType variant', () => {
    const types: AlertRule['type'][] = [
      'LargeTransfer',
      'AdminFunctionCalled',
      'AnyTransaction',
      'FunctionCalled',
      'TransactionFailed',
    ]
    for (const type of types) {
      expect(formatRuleSummary({ type })).toBeTypeOf('string')
    }
  })
})

describe('formatId (consolidated into truncateId)', () => {
  it('does not truncate a short id', () => {
    expect(truncateId('CABC1234', 8)).toBe('CABC1234')
  })

  it('truncates a long id in the middle', () => {
    const id = 'C' + 'A'.repeat(55)
    expect(truncateId(id, 8)).toBe(`${id.slice(0, 8)}...${id.slice(-8)}`)
  })

  it('honours a custom chars value', () => {
    const id = 'C' + 'A'.repeat(55)
    expect(truncateId(id, 12)).toBe(`${id.slice(0, 12)}...${id.slice(-12)}`)
  })
})

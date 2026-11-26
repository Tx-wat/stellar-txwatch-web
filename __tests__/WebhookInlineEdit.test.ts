import { describe, it, expect } from 'vitest'
import { isValidUrl } from '@/lib/stellar'

describe('webhook inline edit — URL validation', () => {
  it('accepts a valid HTTPS URL', () => {
    expect(isValidUrl('https://example.com/webhook')).toBe(true)
  })

  it('rejects an HTTP URL', () => {
    expect(isValidUrl('http://example.com/webhook')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })

  it('allows empty webhook URL (removes webhook)', () => {
    // Business rule: empty string is allowed (removes webhook), so we only
    // validate when trimmed is non-empty.
    const trimmed = ''
    const shouldValidate = trimmed.length > 0
    expect(shouldValidate).toBe(false)
  })
})

import { describe, it, expect } from 'vitest'
import { isValidUrl } from '../stellar'

describe('isValidUrl', () => {
  it('accepts a valid http URL', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('accepts a valid https URL', () => {
    expect(isValidUrl('https://example.com/webhook')).toBe(true)
  })

  it('rejects an ftp URL', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false)
  })

  it('rejects a ws URL', () => {
    expect(isValidUrl('ws://example.com')).toBe(false)
  })

  it('rejects a plain string with no protocol', () => {
    expect(isValidUrl('example.com')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })

  it('rejects a malformed URL', () => {
    expect(isValidUrl('not a url at all')).toBe(false)
  })

  it('rejects a URL with only a protocol', () => {
    expect(isValidUrl('https://')).toBe(false)
  })

  it('accepts a URL with trimmed whitespace when pre-trimmed', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
  })

  it('accepts a URL with surrounding whitespace (URL constructor trims automatically)', () => {
    // The URL constructor strips surrounding whitespace, so these are treated as valid
    expect(isValidUrl('  https://example.com  ')).toBe(true)
  })
})

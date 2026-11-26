import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS } from '@/lib/storage'

describe('settings — explorer preference', () => {
  it('DEFAULT_SETTINGS has stellar-expert as default explorer', () => {
    expect(DEFAULT_SETTINGS.explorer).toBe('stellar-expert')
  })
})

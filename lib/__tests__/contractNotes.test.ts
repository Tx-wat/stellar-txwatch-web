/**
 * Contract notes (issue #590): storage normalisation, schema validation and
 * the v3 migration that cleans up previously stored values.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WatchedContract } from '@/types'
import { normalizeNotes, saveContract, getContracts, migrateToV3, migrateStorage } from '../storage'
import { WatchedContractSchema } from '../schemas'
import { MAX_NOTES_LENGTH } from '../constants'
import { STORAGE_KEYS } from '../storageKeys'

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
    for (const key of Object.keys(store)) delete store[key]
  },
  get length() {
    return Object.keys(store).length
  },
  key: (i: number) => Object.keys(store)[i] ?? null,
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
})

function makeContract(overrides: Partial<WatchedContract> = {}): WatchedContract {
  return {
    id: 'c1',
    label: 'Notes Contract',
    contract_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7',
    network: 'testnet',
    rules: [],
    webhook_url: 'https://example.com/hook',
    created_at: 1000,
    updated_at: 1000,
    ...overrides,
  }
}

beforeEach(() => {
  localStorageMock.clear()
  vi.restoreAllMocks()
})

describe('normalizeNotes', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeNotes('  hello  ')).toBe('hello')
  })

  it('keeps internal line breaks', () => {
    expect(normalizeNotes('line one\nline two')).toBe('line one\nline two')
  })

  it('treats blank and non-string values as no notes', () => {
    expect(normalizeNotes('   ')).toBeUndefined()
    expect(normalizeNotes('')).toBeUndefined()
    expect(normalizeNotes(undefined)).toBeUndefined()
    expect(normalizeNotes(42)).toBeUndefined()
  })

  it('truncates notes longer than the maximum', () => {
    expect(normalizeNotes('a'.repeat(MAX_NOTES_LENGTH + 50))).toHaveLength(MAX_NOTES_LENGTH)
  })
})

describe('WatchedContractSchema notes', () => {
  it('accepts a contract with notes', () => {
    const result = WatchedContractSchema.safeParse(makeContract({ notes: 'Escrow for client A' }))
    expect(result.success).toBe(true)
  })

  it('rejects notes over the maximum length', () => {
    const result = WatchedContractSchema.safeParse(
      makeContract({ notes: 'a'.repeat(MAX_NOTES_LENGTH + 1) })
    )
    expect(result.success).toBe(false)
  })
})

describe('saveContract notes', () => {
  it('persists notes and reads them back', () => {
    saveContract(makeContract({ notes: 'Settlement contract' }))
    expect(getContracts()[0].notes).toBe('Settlement contract')
  })

  it('trims notes before storing', () => {
    saveContract(makeContract({ notes: '  padded  ' }))
    expect(getContracts()[0].notes).toBe('padded')
  })

  it('preserves line breaks', () => {
    saveContract(makeContract({ notes: 'first\nsecond' }))
    expect(getContracts()[0].notes).toContain('\n')
  })

  it('drops blank notes to undefined', () => {
    saveContract(makeContract({ notes: '   ' }))
    expect(getContracts()[0].notes).toBeUndefined()
  })

  it('truncates oversized notes instead of dropping the contract', () => {
    saveContract(makeContract({ notes: 'a'.repeat(MAX_NOTES_LENGTH + 100) }))
    const contracts = getContracts()
    expect(contracts).toHaveLength(1)
    expect(contracts[0].notes).toHaveLength(MAX_NOTES_LENGTH)
  })

  it('updates notes for an existing contract', () => {
    saveContract(makeContract())
    saveContract(makeContract({ notes: 'Updated' }))
    expect(getContracts()).toHaveLength(1)
    expect(getContracts()[0].notes).toBe('Updated')
  })
})

describe('migrateToV3', () => {
  function seed(contracts: unknown[]) {
    localStorageMock.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts))
  }

  it('trims legacy notes and leaves other fields intact', () => {
    seed([{ ...makeContract({ id: 'c1' }), notes: '  legacy notes ' }])
    migrateToV3()
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.CONTRACTS)!)
    expect(stored[0].notes).toBe('legacy notes')
    expect(stored[0].label).toBe('Notes Contract')
  })

  it('truncates oversized legacy notes rather than dropping the contract', () => {
    seed([{ ...makeContract(), notes: 'a'.repeat(MAX_NOTES_LENGTH + 500) }])
    migrateToV3()
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.CONTRACTS)!)
    expect(stored).toHaveLength(1)
    expect(stored[0].notes).toHaveLength(MAX_NOTES_LENGTH)
  })

  it('removes blank legacy notes', () => {
    seed([{ ...makeContract(), notes: '   ' }])
    migrateToV3()
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.CONTRACTS)!)
    expect(stored[0].notes).toBeUndefined()
  })

  it('leaves already-valid contracts untouched', () => {
    const raw = JSON.stringify([{ ...makeContract(), notes: 'clean' }])
    localStorageMock.setItem(STORAGE_KEYS.CONTRACTS, raw)
    migrateToV3()
    expect(localStorageMock.getItem(STORAGE_KEYS.CONTRACTS)).toBe(raw)
  })

  it('does nothing when there are no stored contracts', () => {
    expect(() => migrateToV3()).not.toThrow()
    expect(localStorageMock.getItem(STORAGE_KEYS.CONTRACTS)).toBeNull()
  })

  it('ignores malformed JSON', () => {
    localStorageMock.setItem(STORAGE_KEYS.CONTRACTS, '{not json')
    expect(() => migrateToV3()).not.toThrow()
  })

  it('runs through migrateStorage and bumps the stored version to 3', () => {
    localStorageMock.setItem(STORAGE_KEYS.STORAGE_VERSION, '2')
    seed([{ ...makeContract(), notes: '  padded ' }])
    migrateStorage({ 3: migrateToV3 })
    expect(localStorageMock.getItem(STORAGE_KEYS.STORAGE_VERSION)).toBe('3')
    const stored = JSON.parse(localStorageMock.getItem(STORAGE_KEYS.CONTRACTS)!)
    expect(stored[0].notes).toBe('padded')
  })
})

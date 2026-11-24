import { beforeEach, describe, expect, it } from 'vitest'
import { deleteContracts, getAllAlerts, getContracts, saveAlert, saveContract } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import type { AlertPayload, WatchedContract } from '@/types'

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

Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true })

function makeContract(id: string): WatchedContract {
  return {
    id,
    label: `Contract ${id}`,
    contract_id: `C-${id}`,
    network: 'testnet',
    rules: [],
    webhook_url: '',
    created_at: 1,
    updated_at: 1,
  }
}

function makeAlert(contractId: string): AlertPayload {
  return {
    label: 'Alert',
    contract_id: contractId,
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: `tx-${contractId}`,
    timestamp: Date.now(),
    horizon_link: 'https://horizon-testnet.stellar.org',
  }
}

describe('bulk contract deletion (#584)', () => {
  beforeEach(() => localStorageMock.clear())

  it('deletes every selected contract through storage and drops their alerts', () => {
    saveContract(makeContract('a'))
    saveContract(makeContract('b'))
    saveContract(makeContract('c'))
    saveAlert(makeAlert('C-a'))
    saveAlert(makeAlert('C-c'))

    const deleted = deleteContracts(['a', 'b', 'a'])

    expect(deleted).toBe(2)
    expect(getContracts().map((c) => c.id)).toEqual(['c'])
    expect(getAllAlerts()).toHaveLength(1)
    expect(getAllAlerts()[0].contract_id).toBe('C-c')
    expect(localStorageMock.getItem(STORAGE_KEYS.CONTRACTS)).toContain('"id":"c"')
  })

  it('is a no-op for an empty selection', () => {
    saveContract(makeContract('a'))

    expect(deleteContracts([])).toBe(0)
    expect(getContracts()).toHaveLength(1)
  })
})

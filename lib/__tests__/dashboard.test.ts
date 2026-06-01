import { describe, it, expect, beforeEach } from 'vitest'
import {
  getContracts,
  saveContract,
  deleteContract,
  getTodayAlertCount,
  addAlert,
  getAlerts,
  getNetworkDistribution,
} from '../storage'
import { WatchedContract, AlertPayload } from '@/types'

// Minimal localStorage shim for node environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (i: number) => Object.keys(store)[i] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })
Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true })

function makeContract(overrides: Partial<WatchedContract> = {}): WatchedContract {
  return {
    id: 'c1',
    label: 'Test Contract',
    contract_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7',
    network: 'testnet',
    rules: [],
    webhook_url: '',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  }
}

function makeAlert(overrides: Partial<AlertPayload> = {}): AlertPayload {
  return {
    label: 'Test',
    contract_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7',
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: 'abc123',
    timestamp: Date.now(),
    horizon_link: 'https://horizon-testnet.stellar.org/transactions/abc123',
    ...overrides,
  }
}

beforeEach(() => {
  localStorageMock.clear()
})

// ── Contracts list (empty / populated) ──────────────────────────────────────

describe('contracts list — empty state', () => {
  it('returns empty array when no contracts saved', () => {
    expect(getContracts()).toEqual([])
  })
})

describe('contracts list — populated state', () => {
  it('returns saved contracts', () => {
    saveContract(makeContract({ id: 'c1', label: 'Alpha' }))
    saveContract(makeContract({ id: 'c2', label: 'Beta' }))
    const contracts = getContracts()
    expect(contracts).toHaveLength(2)
    expect(contracts.map((c) => c.label)).toEqual(expect.arrayContaining(['Alpha', 'Beta']))
  })

  it('reflects deletion', () => {
    saveContract(makeContract({ id: 'c1' }))
    saveContract(makeContract({ id: 'c2' }))
    deleteContract('c1')
    const contracts = getContracts()
    expect(contracts).toHaveLength(1)
    expect(contracts[0].id).toBe('c2')
  })

  it('updates existing contract in place', () => {
    saveContract(makeContract({ id: 'c1', label: 'Old' }))
    saveContract(makeContract({ id: 'c1', label: 'New' }))
    const contracts = getContracts()
    expect(contracts).toHaveLength(1)
    expect(contracts[0].label).toBe('New')
  })
})

// ── Filter behavior: active webhooks ────────────────────────────────────────

describe('active webhooks filter', () => {
  it('counts contracts with a non-empty webhook_url', () => {
    saveContract(makeContract({ id: 'c1', webhook_url: 'https://example.com/hook' }))
    saveContract(makeContract({ id: 'c2', webhook_url: '' }))
    saveContract(makeContract({ id: 'c3', webhook_url: 'https://other.com/hook' }))
    const contracts = getContracts()
    const activeWebhooks = contracts.filter((c) => c.webhook_url).length
    expect(activeWebhooks).toBe(2)
  })

  it('returns 0 when no contracts have webhooks', () => {
    saveContract(makeContract({ id: 'c1', webhook_url: '' }))
    const contracts = getContracts()
    expect(contracts.filter((c) => c.webhook_url).length).toBe(0)
  })
})

// ── Stats: contracts count ───────────────────────────────────────────────────

describe('dashboard stats — contracts count', () => {
  it('reflects the number of saved contracts', () => {
    expect(getContracts().length).toBe(0)
    saveContract(makeContract({ id: 'c1' }))
    expect(getContracts().length).toBe(1)
    saveContract(makeContract({ id: 'c2' }))
    expect(getContracts().length).toBe(2)
  })
})

describe('dashboard stats — network distribution', () => {
  it('counts contracts by network', () => {
    saveContract(makeContract({ id: 'c1', network: 'mainnet' }))
    saveContract(makeContract({ id: 'c2', network: 'testnet' }))
    saveContract(makeContract({ id: 'c3', network: 'testnet' }))

    expect(getNetworkDistribution()).toEqual({
      mainnet: 1,
      testnet: 2,
    })
  })
})

// ── Stats: alerts today ──────────────────────────────────────────────────────

describe('dashboard stats — alerts today', () => {
  it('returns 0 when no alerts exist', () => {
    expect(getTodayAlertCount()).toBe(0)
  })

  it('counts only alerts from today', () => {
    const todayAlert = makeAlert({ timestamp: Date.now() })
    const oldAlert = makeAlert({
      transaction_hash: 'old',
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
    })
    addAlert(todayAlert)
    addAlert(oldAlert)
    expect(getTodayAlertCount()).toBe(1)
  })

  it('counts multiple alerts from today', () => {
    addAlert(makeAlert({ transaction_hash: 'tx1' }))
    addAlert(makeAlert({ transaction_hash: 'tx2' }))
    addAlert(makeAlert({ transaction_hash: 'tx3' }))
    expect(getTodayAlertCount()).toBe(3)
  })
})

// ── Stats: alerts per contract ───────────────────────────────────────────────

describe('getAlerts — per contract filter', () => {
  it('returns empty array for contract with no alerts', () => {
    expect(getAlerts('CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7')).toEqual([])
  })

  it('returns only alerts for the specified contract', () => {
    addAlert(makeAlert({ contract_id: 'CONTRACT_A', transaction_hash: 'tx-a' }))
    addAlert(makeAlert({ contract_id: 'CONTRACT_B', transaction_hash: 'tx-b' }))
    expect(getAlerts('CONTRACT_A')).toHaveLength(1)
    expect(getAlerts('CONTRACT_B')).toHaveLength(1)
    expect(getAlerts('CONTRACT_C')).toHaveLength(0)
  })
})

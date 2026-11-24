import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addAlert,
  CURRENT_STORAGE_VERSION,
  deleteAlert,
  deleteAlerts,
  deleteAlertsByContractId,
  deleteContract,
  deleteContracts,
  getAlerts,
  getAllAlerts,
  getContract,
  getContracts,
  getNetworkDistribution,
  migrateStorage,
  pruneOldAlerts,
  restoreContract,
  saveAlert,
  saveContract,
} from '../storage'
import { clearStorageErrorHandlers } from '../storageLogger'
import { STORAGE_KEYS } from '../storageKeys'
import { MAX_ALERTS_PER_CONTRACT } from '../constants'
import type { AlertPayload, Network, WatchedContract } from '@/types'

type ContractWithExtras = WatchedContract & {
  notes?: string
  enabled?: boolean
}

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
})()

const CONTRACTS_KEY = STORAGE_KEYS.CONTRACTS
const ALERTS_KEY = STORAGE_KEYS.ALERTS
const VERSION_KEY = STORAGE_KEYS.STORAGE_VERSION

const CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7'

function makeContract(overrides: Partial<ContractWithExtras> = {}): WatchedContract {
  return {
    id: 'c1',
    label: 'Test Contract',
    contract_id: CONTRACT_ID,
    network: 'testnet',
    rules: [],
    webhook_url: '',
    created_at: 1000,
    updated_at: 1000,
    ...overrides,
  }
}

function makeAlert(overrides: Partial<AlertPayload> = {}): AlertPayload {
  return {
    id: 'a1',
    label: 'Alert',
    contract_id: CONTRACT_ID,
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: 'tx',
    timestamp: Date.now(),
    horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx',
    ...overrides,
  }
}

Object.defineProperty(global, 'localStorage', { value: localStorageMock })

const contract1 = makeContract({ id: 'c1', label: 'Contract Alpha', network: 'mainnet' })
const contract2 = makeContract({
  id: 'c2',
  label: 'Contract Beta',
  network: 'testnet',
  contract_id: 'CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
})
const alert1 = makeAlert({ id: 'a1', contract_id: 'c1' })
const alert2 = makeAlert({ id: 'a2', contract_id: 'c1' })
const alert3 = makeAlert({ id: 'a3', contract_id: 'c1' })

beforeEach(() => {
  localStorageMock.clear()
  clearStorageErrorHandlers()
})

describe('saveContract / getContracts', () => {
  it('saves a contract and retrieves it', () => {
    saveContract(contract1)
    const contracts = getContracts()
    expect(contracts).toHaveLength(1)
    expect(contracts[0].id).toBe('c1')
    expect(getContract('c1')?.label).toBe('Contract Alpha')
  })

  it('retrieves multiple saved contracts', () => {
    saveContract(contract1)
    saveContract(contract2)
    expect(getContracts()).toHaveLength(2)
    expect(getNetworkDistribution()).toEqual({ mainnet: 1, testnet: 1 })
  })

  it('returns an empty array when nothing is saved', () => {
    expect(getContracts()).toEqual([])
  })

  it('does not create a duplicate when saving the same id twice', () => {
    saveContract(contract1)
    saveContract({ ...contract1, label: 'Updated Label' })
    const contracts = getContracts()
    expect(contracts).toHaveLength(1)
    expect(contracts[0].label).toBe('Updated Label')
  })
})

describe('contract notes', () => {
  const contractWithNotes = makeContract({
    notes: 'Owner: team-a\nRunbook: https://example.com/runbook',
  }) as ContractWithExtras

  it('saves and retrieves notes, preserving line breaks', () => {
    saveContract(contractWithNotes)
    const stored = getContracts()[0] as ContractWithExtras
    expect(stored.notes).toBe(contractWithNotes.notes)
    expect(stored.notes).toContain('\n')
  })

  it('leaves notes undefined when the contract has none', () => {
    saveContract(contract1)
    expect((getContracts()[0] as ContractWithExtras).notes).toBeUndefined()
  })

  it('updates notes when saving a duplicate id', () => {
    saveContract(contract1)
    saveContract({ ...contract1, notes: 'Updated notes' } as ContractWithExtras)
    expect((getContracts()[0] as ContractWithExtras).notes).toBe('Updated notes')
  })

  it('accepts notes of exactly 1000 characters', () => {
    const notes = 'a'.repeat(1000)
    saveContract({ ...contract1, notes } as ContractWithExtras)
    expect((getContracts()[0] as ContractWithExtras).notes).toBe(notes)
  })

  it('truncates notes longer than 1000 characters', () => {
    const notes = 'a'.repeat(1001)
    saveContract({ ...contract1, notes } as ContractWithExtras)
    const stored = (getContracts()[0] as ContractWithExtras).notes
    expect(stored).toBe(notes.slice(0, 1000))
  })
})

describe('deleteContract / deleteContracts', () => {
  it('removes the correct contract by id', () => {
    saveContract(contract1)
    saveContract(contract2)
    deleteContract('c1')
    expect(getContracts().map((c) => c.id)).toEqual(['c2'])
  })

  it('is a no-op when deleting a non-existent id', () => {
    saveContract(contract1)
    deleteContract('does-not-exist')
    expect(getContracts()).toHaveLength(1)
  })

  it('deletes each selected contract once and returns the count', () => {
    saveContract(contract1)
    saveContract(contract2)
    expect(deleteContracts(['c1', 'c2', 'c1'])).toBe(2)
    expect(getContracts()).toEqual([])
  })

  it('removes alerts belonging to a deleted contract', () => {
    saveContract(contract1)
    saveAlert(makeAlert({ id: 'a1', contract_id: contract1.contract_id }))
    saveAlert(makeAlert({ id: 'a2', contract_id: contract2.contract_id }))
    deleteContract('c1')
    expect(getAllAlerts().map((a) => a.id)).toEqual(['a2'])
  })
})

describe('enabled flag defaults', () => {
  it('defaults enabled to true when saving a contract without the flag', () => {
    saveContract(contract1)
    expect((getContracts()[0] as ContractWithExtras).enabled).toBe(true)
  })

  it('preserves an explicit enabled: false', () => {
    saveContract({ ...contract1, enabled: false } as ContractWithExtras)
    expect((getContracts()[0] as ContractWithExtras).enabled).toBe(false)
  })

  it('migrates legacy stored contracts without enabled to true', () => {
    localStorageMock.setItem(
      CONTRACTS_KEY,
      JSON.stringify([
        { ...contract1 },
        { ...contract2, enabled: false },
      ]),
    )
    const contracts = getContracts() as ContractWithExtras[]
    expect(contracts).toHaveLength(2)
    expect(contracts[0].enabled).toBe(true)
    expect(contracts[1].enabled).toBe(false)
  })
})

describe('restoreContract', () => {
  it('restores a deleted contract exactly', () => {
    saveContract(contract1)
    saveContract(contract2)
    const snapshot = getContracts().find((c) => c.id === 'c1')
    deleteContract('c1')
    restoreContract(snapshot!)
    expect(getContracts().find((c) => c.id === 'c1')).toEqual(snapshot)
    expect(getContracts()).toHaveLength(2)
  })

  it('preserves enabled: false', () => {
    saveContract({ ...contract1, enabled: false } as ContractWithExtras)
    const snapshot = getContracts()[0]
    deleteContract('c1')
    restoreContract(snapshot)
    expect((getContracts()[0] as ContractWithExtras).enabled).toBe(false)
  })

  it('restores multiple contracts for bulk undo', () => {
    saveContract(contract1)
    saveContract(contract2)
    const snapshots = getContracts()
    deleteContract('c1')
    deleteContract('c2')
    expect(getContracts()).toEqual([])
    snapshots.forEach((contract) => restoreContract(contract))
    expect(getContracts().map((c) => c.id)).toEqual(['c1', 'c2'])
  })

  it('does not duplicate an existing contract', () => {
    saveContract(contract1)
    restoreContract(getContracts()[0])
    expect(getContracts()).toHaveLength(1)
  })
})

describe('saveAlert / getAlerts', () => {
  it('returns alerts in insertion order for a contract', () => {
    saveAlert(alert1)
    saveAlert(alert2)
    saveAlert(alert3)
    expect(getAlerts('c1').map((a) => a.id)).toEqual(['a1', 'a2', 'a3'])
  })

  it('supports getAlerts() with no argument for all alerts', () => {
    saveAlert(alert1)
    saveAlert(makeAlert({ id: 'a4', contract_id: 'c2' }))
    expect(getAlerts()).toHaveLength(2)
    expect(getAllAlerts()).toHaveLength(2)
  })

  it('returns an empty array for an unknown contract', () => {
    expect(getAlerts('no-such-contract')).toEqual([])
  })

  it('normalises the legacy contractId field', () => {
    saveAlert({
      id: 'legacy',
      contractId: 'c1',
      label: 'Legacy',
      network: 'mainnet',
      rule_triggered: 'AnyTransaction',
      transaction_hash: 'tx',
      timestamp: Date.now(),
      horizon_link: 'https://horizon.stellar.org/transactions/tx',
    } as AlertPayload)
    expect(getAlerts('c1')).toHaveLength(1)
  })
})

describe('deleteAlert / deleteAlerts', () => {
  beforeEach(() => {
    saveAlert(alert1)
    saveAlert(alert2)
    saveAlert(makeAlert({ id: 'a4', contract_id: 'c2' }))
  })

  it('removes only the specified alert', () => {
    deleteAlert('a1')
    expect(getAlerts('c1').map((a) => a.id)).toEqual(['a2'])
  })

  it('removes all alerts for a contract id', () => {
    deleteAlerts('c1')
    expect(getAlerts('c1')).toEqual([])
    expect(getAlerts('c2')).toHaveLength(1)
  })

  it('exposes deleteAlertsByContractId as an alias', () => {
    deleteAlertsByContractId('c1')
    expect(getAlerts('c1')).toEqual([])
    expect(getAlerts('c2')).toHaveLength(1)
  })
})

describe('per-contract cap', () => {
  it('retains every alert when under the cap', () => {
    for (let i = 0; i < 3; i++) {
      saveAlert(makeAlert({ id: `a${i}`, contract_id: 'c1', timestamp: i + 1 }))
    }
    expect(getAlerts('c1')).toHaveLength(3)
  })

  it('prunes the oldest alerts for that contract only', () => {
    const now = Date.now()
    for (let i = 0; i <= MAX_ALERTS_PER_CONTRACT; i++) {
      saveAlert(makeAlert({ id: `a${i}`, contract_id: 'c1', timestamp: now + i }))
    }
    saveAlert(makeAlert({ id: 'other', contract_id: 'c2', timestamp: now + 10000 }))

    const c1Alerts = getAlerts('c1')
    expect(c1Alerts).toHaveLength(MAX_ALERTS_PER_CONTRACT)
    expect(c1Alerts.some((a) => a.id === 'a0')).toBe(false)
    expect(c1Alerts.some((a) => a.id === `a${MAX_ALERTS_PER_CONTRACT}`)).toBe(true)
    expect(getAlerts('c2').map((a) => a.id)).toEqual(['other'])
  })
})

describe('pruneOldAlerts', () => {
  const NOW = Date.UTC(2026, 0, 1)
  const DAY = 24 * 60 * 60 * 1000

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function writeAlerts(alerts: AlertPayload[]): void {
    localStorageMock.setItem(ALERTS_KEY, JSON.stringify(alerts))
  }

  it('retains an alert exactly at the 90-day cutoff', () => {
    writeAlerts([
      makeAlert({ id: 'old', timestamp: NOW - 90 * DAY - 1 }),
      makeAlert({ id: 'cutoff', timestamp: NOW - 90 * DAY }),
      makeAlert({ id: 'new', timestamp: NOW }),
    ])
    pruneOldAlerts()
    expect(getAlerts().map((a) => a.id)).toEqual(['cutoff', 'new'])
  })

  it('prunes an alert one millisecond beyond the cutoff', () => {
    writeAlerts([
      makeAlert({ id: 'beyond', timestamp: NOW - 90 * DAY - 1 }),
      makeAlert({ id: 'new', timestamp: NOW }),
    ])
    pruneOldAlerts()
    expect(getAlerts().map((a) => a.id)).toEqual(['new'])
  })

  it('keeps today\'s alerts and handles an empty list', () => {
    writeAlerts([makeAlert({ id: 'new', timestamp: NOW })])
    pruneOldAlerts()
    expect(getAlerts()).toHaveLength(1)

    localStorageMock.clear()
    expect(() => pruneOldAlerts()).not.toThrow()
    expect(getAlerts()).toEqual([])
  })

  it('handles mixed old and new alerts', () => {
    writeAlerts([
      makeAlert({ id: 'very-old', timestamp: NOW - 200 * DAY }),
      makeAlert({ id: 'new', timestamp: NOW }),
    ])
    pruneOldAlerts()
    expect(getAlerts().map((a) => a.id)).toEqual(['new'])
  })
})

describe('migrateStorage', () => {
  it('does not call migrations when already at the current version', () => {
    localStorageMock.setItem(VERSION_KEY, CURRENT_STORAGE_VERSION.toString())
    const migration1 = vi.fn()
    const migration2 = vi.fn()
    migrateStorage({ 1: migration1, 2: migration2 })
    expect(migration1).not.toHaveBeenCalled()
    expect(migration2).not.toHaveBeenCalled()
  })

  it('calls a migration exactly once when needed', () => {
    localStorageMock.setItem(VERSION_KEY, '0')
    const migration1 = vi.fn()
    migrateStorage({ 1: migration1 }, 1)
    expect(migration1).toHaveBeenCalledTimes(1)
  })

  it('runs migrations in ascending version order', () => {
    localStorageMock.setItem(VERSION_KEY, '0')
    const callOrder: number[] = []
    const migrations: Record<number, () => void> = {
      2: vi.fn(() => callOrder.push(2)),
      1: vi.fn(() => callOrder.push(1)),
      3: vi.fn(() => callOrder.push(3)),
    }
    migrateStorage(migrations, 3)
    expect(callOrder).toEqual([1, 2, 3])
  })

  it('skips missing migration versions gracefully', () => {
    localStorageMock.setItem(VERSION_KEY, '0')
    const callOrder: number[] = []
    expect(() =>
      migrateStorage({ 1: vi.fn(() => callOrder.push(1)), 3: vi.fn(() => callOrder.push(3)) }, 3)
    ).not.toThrow()
    expect(callOrder).toEqual([1, 3])
  })

  it('records the target version after migration', () => {
    localStorageMock.setItem(VERSION_KEY, '0')
    migrateStorage({ 1: vi.fn() })
    expect(localStorageMock.getItem(VERSION_KEY)).toBe(CURRENT_STORAGE_VERSION.toString())
  })
})

describe('Network type coverage', () => {
  it('supports all networks', () => {
    const networks: Network[] = ['mainnet', 'testnet', 'futurenet']
    for (const network of networks) {
      saveContract(makeContract({ id: network, network }))
    }
    expect(getContracts()).toHaveLength(3)
  })
})

describe('addAlert alias', () => {
  it('adds alerts through the lower-level helper', () => {
    addAlert(alert1)
    expect(getAlerts('c1').map((a) => a.id)).toEqual(['a1'])
  })
})

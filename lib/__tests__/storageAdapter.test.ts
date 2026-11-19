import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageAdapter, LocalStorageAdapter } from '../storageAdapter'
import { InMemoryStorageAdapter } from '../inMemoryStorageAdapter'
import { WatchedContract, AlertPayload } from '@/types'

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

function makeContract(overrides: Partial<WatchedContract> = {}): WatchedContract {
  return {
    id: 'c1',
    label: 'Test Contract',
    contract_id: 'CONTRACT_1',
    network: 'testnet',
    rules: [{ type: 'AnyTransaction' }],
    webhook_url: 'https://example.com/hook',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...overrides,
  }
}

function makeAlert(overrides: Partial<AlertPayload> = {}): AlertPayload {
  return {
    label: 'Test',
    contract_id: 'CONTRACT_1',
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: 'abc123',
    timestamp: Date.now(),
    horizon_link: 'https://horizon-testnet.stellar.org/transactions/abc123',
    ...overrides,
  }
}

const adapters: [string, () => StorageAdapter][] = [
  ['InMemoryStorageAdapter', () => new InMemoryStorageAdapter()],
  ['LocalStorageAdapter', () => new LocalStorageAdapter()],
]

describe.each(adapters)('%s', (_name, createAdapter) => {
  let adapter: StorageAdapter

  beforeEach(() => {
    localStorageMock.clear()
    adapter = createAdapter()
  })

  it('starts empty', async () => {
    expect(await adapter.getContracts()).toEqual([])
    expect(await adapter.getAllAlerts()).toEqual([])
  })

  it('saves and retrieves contracts', async () => {
    await adapter.saveContract(makeContract())
    await adapter.saveContract(makeContract({ id: 'c2', contract_id: 'CONTRACT_2' }))
    expect(await adapter.getContracts()).toHaveLength(2)
    expect((await adapter.getContract('c2'))?.contract_id).toBe('CONTRACT_2')
  })

  it('replaces a contract saved with the same id', async () => {
    await adapter.saveContract(makeContract())
    await adapter.saveContract(makeContract({ label: 'Renamed' }))
    const contracts = await adapter.getContracts()
    expect(contracts).toHaveLength(1)
    expect(contracts[0].label).toBe('Renamed')
  })

  it('returns undefined for an unknown contract', async () => {
    expect(await adapter.getContract('missing')).toBeUndefined()
  })

  it('deletes a contract along with its alerts', async () => {
    await adapter.saveContract(makeContract())
    await adapter.addAlert(makeAlert())
    await adapter.addAlert(makeAlert({ contract_id: 'OTHER' }))
    await adapter.deleteContract('c1')
    expect(await adapter.getContracts()).toEqual([])
    expect(await adapter.getAlerts('CONTRACT_1')).toEqual([])
    expect(await adapter.getAlerts('OTHER')).toHaveLength(1)
  })

  it('filters alerts by contract id', async () => {
    await adapter.addAlert(makeAlert({ transaction_hash: 'a' }))
    await adapter.addAlert(makeAlert({ transaction_hash: 'b', contract_id: 'OTHER' }))
    const alerts = await adapter.getAlerts('CONTRACT_1')
    expect(alerts.map((a) => a.transaction_hash)).toEqual(['a'])
    expect(await adapter.getAllAlerts()).toHaveLength(2)
  })

  it('returns the most recent alert time per contract', async () => {
    await adapter.addAlert(makeAlert({ timestamp: 100 }))
    await adapter.addAlert(makeAlert({ timestamp: 300 }))
    await adapter.addAlert(makeAlert({ contract_id: 'OTHER', timestamp: 200 }))
    expect(await adapter.getLastAlertTimes()).toEqual({ CONTRACT_1: 300, OTHER: 200 })
  })

  it('reuses last alert times until alerts change', async () => {
    await adapter.addAlert(makeAlert({ timestamp: 100 }))
    const first = await adapter.getLastAlertTimes()
    expect(await adapter.getLastAlertTimes()).toBe(first)
    await adapter.addAlert(makeAlert({ timestamp: 400 }))
    expect(await adapter.getLastAlertTimes()).toEqual({ CONTRACT_1: 400 })
  })

  it("counts only today's alerts", async () => {
    await adapter.addAlert(makeAlert())
    await adapter.addAlert(makeAlert({ timestamp: new Date().setHours(0, 0, 0, 0) - 1 }))
    expect(await adapter.getTodayAlertCount()).toBe(1)
  })

  it('notifies subscribers on writes and stops after unsubscribe', async () => {
    const listener = vi.fn()
    const unsubscribe = adapter.subscribe(listener)
    await adapter.saveContract(makeContract())
    await adapter.addAlert(makeAlert())
    expect(listener).toHaveBeenCalledWith('contracts')
    expect(listener).toHaveBeenCalledWith('alerts')

    listener.mockClear()
    unsubscribe()
    await adapter.saveContract(makeContract({ id: 'c2' }))
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('InMemoryStorageAdapter', () => {
  it('can be seeded with initial data', async () => {
    const adapter = new InMemoryStorageAdapter({
      contracts: [makeContract()],
      alerts: [makeAlert()],
    })
    expect(await adapter.getContracts()).toHaveLength(1)
    expect(await adapter.getAlerts('CONTRACT_1')).toHaveLength(1)
  })

  it('returns copies so callers cannot mutate stored state', async () => {
    const adapter = new InMemoryStorageAdapter({ contracts: [makeContract()] })
    const [contract] = await adapter.getContracts()
    contract.label = 'Mutated'
    expect((await adapter.getContract('c1'))?.label).toBe('Test Contract')
  })
})

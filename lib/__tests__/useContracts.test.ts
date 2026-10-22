// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { useContracts } from '@/lib/useContracts'
import { saveContract } from '@/lib/storage'
import { WatchedContract } from '@/types'

const CONTRACTS_KEY = 'txwatch_contracts'

function makeContract(overrides: Partial<WatchedContract> = {}): WatchedContract {
  return {
    id: 'contract-1',
    label: 'My contract',
    contract_id: 'C' + 'A'.repeat(55),
    network: 'testnet',
    rules: [],
    webhook_url: 'https://example.com/webhook',
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
    ...overrides,
  }
}

function seedStorage(contracts: WatchedContract[]) {
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts))
}

beforeEach(() => {
  localStorage.clear()
})

describe('useContracts', () => {
  it('starts with an empty list on initial load', () => {
    const { result } = renderHook(() => useContracts())
    expect(result.current.contracts).toEqual([])
  })

  it('add(contract) makes the contract appear in the list', () => {
    const { result } = renderHook(() => useContracts())
    const contract = makeContract()

    act(() => {
      result.current.add(contract)
    })

    expect(result.current.contracts).toHaveLength(1)
    expect(result.current.contracts[0]).toMatchObject({
      id: 'contract-1',
      label: 'My contract',
      contract_id: contract.contract_id,
    })
  })

  it('remove(id) deletes the matching contract', () => {
    seedStorage([makeContract(), makeContract({ id: 'contract-2', label: 'Second' })])

    const { result } = renderHook(() => useContracts())
    expect(result.current.contracts).toHaveLength(2)

    act(() => {
      result.current.remove('contract-1')
    })

    expect(result.current.contracts).toHaveLength(1)
    expect(result.current.contracts[0].id).toBe('contract-2')
    expect(JSON.parse(localStorage.getItem(CONTRACTS_KEY)!)).toHaveLength(1)
  })

  it('update(contract) replaces the contract with the same id', () => {
    const { result } = renderHook(() => useContracts())

    act(() => {
      result.current.add(makeContract({ label: 'Original' }))
    })

    act(() => {
      result.current.update(makeContract({ label: 'Renamed' }))
    })

    expect(result.current.contracts).toHaveLength(1)
    expect(result.current.contracts[0].label).toBe('Renamed')
  })

  it('does not grow the list when updating an existing contract', () => {
    const { result } = renderHook(() => useContracts())

    act(() => {
      result.current.add(makeContract({ id: 'a' }))
      result.current.add(makeContract({ id: 'b' }))
      result.current.update(makeContract({ id: 'a', label: 'Updated a' }))
    })

    expect(result.current.contracts).toHaveLength(2)
    expect(result.current.contracts.find((c) => c.id === 'a')?.label).toBe('Updated a')
  })

  describe('cross-tab sync', () => {
    it('refreshes when a storage event for the contracts key fires', () => {
      const { result } = renderHook(() => useContracts())
      expect(result.current.contracts).toEqual([])

      act(() => {
        seedStorage([makeContract({ id: 'from-other-tab' })])
        window.dispatchEvent(new StorageEvent('storage', { key: CONTRACTS_KEY }))
      })

      expect(result.current.contracts).toHaveLength(1)
      expect(result.current.contracts[0].id).toBe('from-other-tab')
    })

    it('ignores storage events for unrelated keys', () => {
      const { result } = renderHook(() => useContracts())

      act(() => {
        window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated-key' }))
      })

      expect(result.current.contracts).toEqual([])
    })

    it('stops listening after unmount', () => {
      const { result, unmount } = renderHook(() => useContracts())
      unmount()

      act(() => {
        seedStorage([makeContract({ id: 'after-unmount' })])
        window.dispatchEvent(new StorageEvent('storage', { key: CONTRACTS_KEY }))
      })

      expect(result.current.contracts).toEqual([])
    })
  })

  describe('SSR guard', () => {
    it('returns an empty array when window is undefined', () => {
      vi.stubGlobal('window', undefined)

      let snapshot: WatchedContract[] | undefined
      function Probe() {
        const { contracts } = useContracts()
        snapshot = contracts
        return createElement('span', null, JSON.stringify(contracts))
      }

      try {
        const html = renderToString(createElement(Probe))
        expect(html).toContain('[]')
        expect(snapshot).toEqual([])
      } finally {
        vi.unstubAllGlobals()
      }
    })
  })
})

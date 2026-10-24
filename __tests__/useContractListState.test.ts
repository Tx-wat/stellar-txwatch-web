import { WatchedContract } from '@/types'
import {
  PAGE_SIZE,
  contractListReducer,
  countByNetwork,
  createInitialState,
  filterContracts,
  getTotalPages,
  groupByNetwork,
  paginate,
  sortContractList,
} from '@/hooks/useContractListState'

function makeContract(overrides: Partial<WatchedContract>): WatchedContract {
  return {
    id: 'id',
    contract_id: 'CABC',
    label: 'Contract',
    network: 'testnet',
    rules: [],
    created_at: 0,
    ...overrides,
  } as WatchedContract
}

const contracts = [
  makeContract({ id: '1', label: 'Escrow Manager', contract_id: 'CESCROW', network: 'mainnet', created_at: 100 }),
  makeContract({ id: '2', label: 'Payment Router', contract_id: 'CPAY', network: 'testnet', created_at: 300 }),
  makeContract({ id: '3', label: 'token service', contract_id: 'CTOKEN', network: 'futurenet', created_at: 200 }),
]

describe('useContractListState — reducer', () => {
  it('creates initial state with the given search', () => {
    expect(createInitialState('foo')).toMatchObject({ search: 'foo', networkFilter: 'all', sortBy: 'newest', page: 1 })
  })

  it('resets page when search or network filter changes', () => {
    const state = { ...createInitialState(), page: 3 }
    expect(contractListReducer(state, { type: 'setSearch', search: 'x' }).page).toBe(1)
    expect(contractListReducer(state, { type: 'setNetworkFilter', networkFilter: 'mainnet' }).page).toBe(1)
  })

  it('keeps page when sort changes', () => {
    const state = { ...createInitialState(), page: 2 }
    expect(contractListReducer(state, { type: 'setSortBy', sortBy: 'oldest' }).page).toBe(2)
  })

  it('never sets page below 1', () => {
    expect(contractListReducer(createInitialState(), { type: 'setPage', page: 0 }).page).toBe(1)
  })

  it('clearFilters resets search and network filter', () => {
    const state = { ...createInitialState('abc'), networkFilter: 'mainnet' as const, page: 4 }
    expect(contractListReducer(state, { type: 'clearFilters' })).toMatchObject({ search: '', networkFilter: 'all', page: 1 })
  })

  it('toggles selection on and off', () => {
    let state = contractListReducer(createInitialState(), { type: 'toggleSelected', id: '1' })
    expect(state.selectedIds).toEqual(['1'])
    state = contractListReducer(state, { type: 'toggleSelected', id: '1' })
    expect(state.selectedIds).toEqual([])
  })

  it('dedupes ids on setSelected and clears selection', () => {
    let state = contractListReducer(createInitialState(), { type: 'setSelected', ids: ['1', '1', '2'] })
    expect(state.selectedIds).toEqual(['1', '2'])
    state = contractListReducer(state, { type: 'clearSelection' })
    expect(state.selectedIds).toEqual([])
  })
})

describe('useContractListState — derivations', () => {
  it('filters by network', () => {
    expect(filterContracts(contracts, 'mainnet', '').map((c) => c.id)).toEqual(['1'])
    expect(filterContracts(contracts, 'all', '')).toHaveLength(3)
  })

  it('filters by label or contract id, case-insensitively', () => {
    expect(filterContracts(contracts, 'all', 'ESCROW').map((c) => c.id)).toEqual(['1'])
    expect(filterContracts(contracts, 'all', 'ctoken').map((c) => c.id)).toEqual(['3'])
    expect(filterContracts(contracts, 'all', '   ')).toHaveLength(3)
  })

  it('combines network and search filters', () => {
    expect(filterContracts(contracts, 'testnet', 'escrow')).toHaveLength(0)
  })

  it('sorts by every option', () => {
    expect(sortContractList(contracts, 'newest').map((c) => c.id)).toEqual(['2', '3', '1'])
    expect(sortContractList(contracts, 'oldest').map((c) => c.id)).toEqual(['1', '3', '2'])
    expect(sortContractList(contracts, 'label-asc').map((c) => c.id)).toEqual(['1', '2', '3'])
    expect(sortContractList(contracts, 'label-desc').map((c) => c.id)).toEqual(['3', '2', '1'])
  })

  it('does not mutate the input when sorting', () => {
    const copy = [...contracts]
    sortContractList(contracts, 'oldest')
    expect(contracts).toEqual(copy)
  })

  it('paginates and computes total pages', () => {
    const items = Array.from({ length: PAGE_SIZE * 2 + 1 }, (_, i) => i)
    expect(getTotalPages(items.length)).toBe(3)
    expect(getTotalPages(0)).toBe(1)
    expect(paginate(items, 3)).toEqual([PAGE_SIZE * 2])
  })

  it('groups and counts by network', () => {
    const groups = groupByNetwork(contracts)
    expect(groups.mainnet.map((c) => c.id)).toEqual(['1'])
    expect(groups.testnet.map((c) => c.id)).toEqual(['2'])
    expect(countByNetwork(contracts)).toEqual({ all: 3, mainnet: 1, testnet: 1, futurenet: 1 })
  })
})

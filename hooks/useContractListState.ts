import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { WatchedContract, Network } from '@/types'

export type ViewMode = 'flat' | 'grouped'
export type NetworkFilter = 'all' | Network
export const ALL_NETWORKS: Network[] = ['mainnet', 'testnet', 'futurenet']
export type SortOption = 'newest' | 'oldest' | 'label-asc' | 'label-desc'

export const PAGE_SIZE = 12

export interface ContractListState {
  search: string
  /** Empty array means "all networks" */
  networkFilters: Network[]
  sortBy: SortOption
  viewMode: ViewMode
  page: number
  selectedIds: string[]
}

export type ContractListAction =
  | { type: 'setSearch'; search: string }
  | { type: 'toggleNetworkFilter'; network: Network }
  | { type: 'setNetworkFilters'; networks: Network[] }
  | { type: 'setSortBy'; sortBy: SortOption }
  | { type: 'setViewMode'; viewMode: ViewMode }
  | { type: 'setPage'; page: number }
  | { type: 'clearFilters' }
  | { type: 'toggleSelected'; id: string }
  | { type: 'setSelected'; ids: string[] }
  | { type: 'clearSelection' }

export function createInitialState(search = ''): ContractListState {
  return {
    search,
    networkFilters: [],
    sortBy: 'newest',
    viewMode: 'flat',
    page: 1,
    selectedIds: [],
  }
}

export function contractListReducer(
  state: ContractListState,
  action: ContractListAction
): ContractListState {
  switch (action.type) {
    case 'setSearch':
      return { ...state, search: action.search, page: 1 }
    case 'toggleNetworkFilter':
      return {
        ...state,
        networkFilters: state.networkFilters.includes(action.network)
          ? state.networkFilters.filter((n) => n !== action.network)
          : [...state.networkFilters, action.network],
        page: 1,
      }
    case 'setNetworkFilters':
      return { ...state, networkFilters: Array.from(new Set(action.networks)), page: 1 }
    case 'setSortBy':
      return { ...state, sortBy: action.sortBy }
    case 'setViewMode':
      return { ...state, viewMode: action.viewMode }
    case 'setPage':
      return { ...state, page: Math.max(1, action.page) }
    case 'clearFilters':
      return { ...state, search: '', networkFilters: [], page: 1 }
    case 'toggleSelected':
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      }
    case 'setSelected':
      return { ...state, selectedIds: Array.from(new Set(action.ids)) }
    case 'clearSelection':
      return { ...state, selectedIds: [] }
    default:
      return state
  }
}

export function filterContracts(
  contracts: WatchedContract[],
  networkFilters: Network[],
  search: string
): WatchedContract[] {
  const byNetwork =
    networkFilters.length === 0
      ? contracts
      : contracts.filter((contract) => networkFilters.includes(contract.network))

  const query = search.trim().toLowerCase()
  if (!query) return byNetwork

  return byNetwork.filter(
    (contract) =>
      contract.label.toLowerCase().includes(query) ||
      contract.contract_id.toLowerCase().includes(query)
  )
}

export function sortContractList(contracts: WatchedContract[], sortBy: SortOption): WatchedContract[] {
  const sorted = [...contracts]
  switch (sortBy) {
    case 'oldest':
      return sorted.sort((a, b) => a.created_at - b.created_at)
    case 'label-asc':
      return sorted.sort((a, b) => a.label.localeCompare(b.label))
    case 'label-desc':
      return sorted.sort((a, b) => b.label.localeCompare(a.label))
    case 'newest':
    default:
      return sorted.sort((a, b) => b.created_at - a.created_at)
  }
}

export function getTotalPages(count: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / pageSize))
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize)
}

export function groupByNetwork(contracts: WatchedContract[]): Record<Network, WatchedContract[]> {
  const groups: Record<Network, WatchedContract[]> = {
    mainnet: [],
    testnet: [],
    futurenet: [],
  }
  for (const contract of contracts) {
    groups[contract.network].push(contract)
  }
  return groups
}

export function countByNetwork(contracts: WatchedContract[]): Record<NetworkFilter, number> {
  const counts: Record<NetworkFilter, number> = {
    all: contracts.length,
    mainnet: 0,
    testnet: 0,
    futurenet: 0,
  }
  for (const contract of contracts) {
    counts[contract.network] += 1
  }
  return counts
}

export function useContractListState(contracts: WatchedContract[], initialSearch = '') {
  const [state, dispatch] = useReducer(contractListReducer, initialSearch, createInitialState)

  const filtered = useMemo(
    () => filterContracts(contracts, state.networkFilters, state.search),
    [contracts, state.networkFilters, state.search]
  )
  const sorted = useMemo(() => sortContractList(filtered, state.sortBy), [filtered, state.sortBy])
  const totalPages = getTotalPages(sorted.length)
  const paginated = useMemo(() => paginate(sorted, state.page), [sorted, state.page])
  const grouped = useMemo(() => groupByNetwork(sorted), [sorted])
  const networkCounts = useMemo(() => countByNetwork(contracts), [contracts])

  useEffect(() => {
    if (state.page > totalPages) {
      dispatch({ type: 'setPage', page: totalPages })
    }
  }, [state.page, totalPages])

  // Drop selections for contracts that no longer exist
  useEffect(() => {
    const existing = new Set(contracts.map((contract) => contract.id))
    if (state.selectedIds.some((id) => !existing.has(id))) {
      dispatch({ type: 'setSelected', ids: state.selectedIds.filter((id) => existing.has(id)) })
    }
  }, [contracts, state.selectedIds])

  const visible = state.viewMode === 'grouped' ? sorted : paginated
  const allVisibleSelected =
    visible.length > 0 && visible.every((contract) => state.selectedIds.includes(contract.id))

  const setSearch = useCallback((search: string) => dispatch({ type: 'setSearch', search }), [])
  const toggleNetworkFilter = useCallback(
    (network: Network) => dispatch({ type: 'toggleNetworkFilter', network }),
    []
  )
  const setNetworkFilters = useCallback(
    (networks: Network[]) => dispatch({ type: 'setNetworkFilters', networks }),
    []
  )
  const setSortBy = useCallback((sortBy: SortOption) => dispatch({ type: 'setSortBy', sortBy }), [])
  const setViewMode = useCallback((viewMode: ViewMode) => dispatch({ type: 'setViewMode', viewMode }), [])
  const setPage = useCallback((page: number) => dispatch({ type: 'setPage', page }), [])
  const clearFilters = useCallback(() => dispatch({ type: 'clearFilters' }), [])
  const toggleSelected = useCallback((id: string) => dispatch({ type: 'toggleSelected', id }), [])
  const clearSelection = useCallback(() => dispatch({ type: 'clearSelection' }), [])
  const toggleSelectAllVisible = useCallback(() => {
    const visibleIds = visible.map((contract) => contract.id)
    if (allVisibleSelected) {
      dispatch({ type: 'setSelected', ids: state.selectedIds.filter((id) => !visibleIds.includes(id)) })
    } else {
      dispatch({ type: 'setSelected', ids: [...state.selectedIds, ...visibleIds] })
    }
  }, [visible, allVisibleSelected, state.selectedIds])

  return {
    ...state,
    filtered,
    sorted,
    paginated,
    grouped,
    networkCounts,
    totalPages,
    allVisibleSelected,
    setSearch,
    toggleNetworkFilter,
    setNetworkFilters,
    setSortBy,
    setViewMode,
    setPage,
    clearFilters,
    toggleSelected,
    toggleSelectAllVisible,
    clearSelection,
  }
}

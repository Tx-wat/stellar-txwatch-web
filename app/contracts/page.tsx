'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WatchedContract, Network } from '@/types'
import { getContracts, getAlerts } from '@/lib/storage'
import ContractCard from '@/components/ContractCard'
import EmptyState from '@/components/EmptyState'

type ViewMode = 'flat' | 'grouped'
type NetworkFilter = 'all' | Network

const NETWORK_LABELS: Record<Network, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  futurenet: 'Futurenet',
}

const NETWORK_FILTERS: { value: NetworkFilter; label: string }[] = [
  { value: 'all', label: 'All Networks' },
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
  { value: 'futurenet', label: 'Futurenet' },
]

export default function ContractsPage() {
  const [allContracts, setAllContracts] = useState<WatchedContract[]>([])
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('flat')
  const [page, setPage] = useState(1)
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => {
    const all = getContracts()
    setAllContracts(all)
    setMounted(true)
  }, [])

  const filtered = useMemo(() => {
    if (networkFilter === 'all') {
      return allContracts
    }
    return allContracts.filter((c) => c.network === networkFilter)
  }, [allContracts, networkFilter])

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1)
  }, [networkFilter, filter])

  const filtered = useMemo(() => {
    if (networkFilter === 'all') return contracts
    return contracts.filter((c: WatchedContract) => c.network === networkFilter)
  }, [contracts, networkFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const grouped = useMemo(() => {
    const groups: Record<Network, WatchedContract[]> = {
      mainnet: [],
      testnet: [],
      futurenet: [],
    }
    for (const c of filtered) {
      if (groups[c.network]) {
        groups[c.network].push(c)
      }
    }
    return groups
  }, [filtered])

  if (!mounted) return null

  const hasAnyContracts = allContracts.length > 0
  const hasFilteredContracts = filtered.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contracts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {filtered.length} registered
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          {hasAnyContracts && (
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none px-3 py-2 pr-8 rounded-lg bg-zinc-800 border border-zinc-700 text-sm font-medium text-zinc-200 hover:bg-zinc-750 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
                aria-label="Sort contracts"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <svg
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
          {/* View mode toggle */}
          {hasAnyContracts && (
            <div className="flex items-center rounded-lg bg-zinc-800 border border-zinc-700 p-0.5">
              <button
                onClick={() => setViewMode('flat')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'flat'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Flat
              </button>
              <button
                onClick={() => setViewMode('grouped')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'grouped'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                By Network
              </button>
            </div>
          )}
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Contract</span>
            <span className="sm:hidden">Add</span>
          </Link>
        </div>
      </div>

      {/* Network filter tabs */}
      {hasAnyContracts && (
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit" role="group" aria-label="Filter by network">
          {NETWORK_FILTERS.map(({ value, label }) => {
            const count = value === 'all' ? allContracts.length : allContracts.filter((c) => c.network === value).length
            const isActive = networkFilter === value
            return (
              <button
                key={value}
                onClick={() => setNetworkFilter(value)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-500 text-indigo-100' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {!hasAnyContracts ? (
        <EmptyState
          title="No contracts yet"
          description="Register a Soroban contract to begin monitoring transactions and configuring alert rules."
          action={
            <Link
              href="/contracts/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
            >
              Add Contract
            </Link>
          }
        />
      ) : !hasFilteredContracts ? (
        <EmptyState
          title="No contracts found"
          description={`No contracts match the current filter. Try selecting a different network or clear the filter to see all contracts.`}
          action={
            <button
              onClick={() => setNetworkFilter('all')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
            >
              Clear Filter
            </button>
          }
        />
      ) : viewMode === 'grouped' ? (
        <div className="space-y-8">
          {(Object.entries(NETWORK_LABELS) as [Network, string][]).map(
            ([network, label]) => {
              const networkContracts = grouped[network]
              if (networkContracts.length === 0) return null
              return (
                <section key={network}>
                  <h2 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-500" />
                    {label}
                    <span className="text-sm font-normal text-zinc-500">
                      ({networkContracts.length})
                    </span>
                  </h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {networkContracts.map((c) => (
                      <ContractCard
                        key={c.id}
                        contract={c}
                        lastAlertTime={getAlerts(c.contract_id)[0]?.timestamp}
                      />
                    ))}
                  </div>
                </section>
              )
            }
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              lastAlertTime={getAlerts(c.id)[0]?.timestamp}
            />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Network, WatchedContract } from '@/types'
import { getContracts, getAlerts } from '@/lib/storage'
import ContractCard from '@/components/ContractCard'
import EmptyState from '@/components/EmptyState'

type NetworkFilter = Network | 'all'

const NETWORK_FILTERS: { value: NetworkFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mainnet', label: 'Mainnet' },
  { value: 'testnet', label: 'Testnet' },
  { value: 'futurenet', label: 'Futurenet' },
]

export default function ContractsPage() {
  const [contracts, setContracts] = useState<WatchedContract[]>([])
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>('all')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setContracts(getContracts())
    setMounted(true)
  }, [])

  if (!mounted) return null

  const filtered =
    networkFilter === 'all'
      ? contracts
      : contracts.filter((c) => c.network === networkFilter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contracts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {filtered.length === contracts.length
              ? `${contracts.length} registered`
              : `${filtered.length} of ${contracts.length} registered`}
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contract
        </Link>
      </div>

      {/* Network filter tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg w-fit" role="group" aria-label="Filter by network">
        {NETWORK_FILTERS.map(({ value, label }) => {
          const count = value === 'all' ? contracts.length : contracts.filter((c) => c.network === value).length
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

      {contracts.length === 0 ? (
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
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`No ${networkFilter} contracts`}
          description={`You have no contracts registered on ${networkFilter}. Try a different network filter or add a new contract.`}
          action={
            <button
              onClick={() => setNetworkFilter('all')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-medium text-white transition-colors"
            >
              Clear filter
            </button>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
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

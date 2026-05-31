'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { WatchedContract, Network } from '@/types'
import { getContracts, getAlerts } from '@/lib/storage'
import ContractCard from '@/components/ContractCard'
import EmptyState from '@/components/EmptyState'

type ViewMode = 'flat' | 'grouped'

const NETWORK_LABELS: Record<Network, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  futurenet: 'Futurenet',
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<WatchedContract[]>([])
  const [mounted, setMounted] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('flat')

  useEffect(() => {
    const all = getContracts()
    if (filter === 'webhooks') {
      setContracts(all.filter((c) => c.webhook_url))
    } else if (filter === 'alerts') {
      const todayStart = new Date().setHours(0, 0, 0, 0)
      setContracts(all.filter((c) => getAlerts(c.contract_id).some((a) => a.timestamp >= todayStart)))
    } else {
      setContracts(all)
    }
    setMounted(true)
  }, [filter])

  const grouped = useMemo(() => {
    const groups: Record<Network, WatchedContract[]> = {
      mainnet: [],
      testnet: [],
      futurenet: [],
    }
    for (const c of contracts) {
      if (groups[c.network]) {
        groups[c.network].push(c)
      }
    }
    return groups
  }, [contracts])

  if (!mounted) return null

  const filterLabel = filter === 'webhooks' ? 'with active webhooks' : filter === 'alerts' ? 'with alerts today' : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Contracts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {contracts.length} {filterLabel ?? 'registered'}
            {filterLabel && <Link href="/contracts" className="ml-2 text-indigo-400 hover:text-indigo-300">clear filter</Link>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
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
      ) : viewMode === 'grouped' ? (
        <div className="space-y-8">
          {(Object.entries(NETWORK_LABELS) as [Network, string][]).map(([network, label]) => {
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
                      lastAlertTime={getAlerts(c.id)[0]?.timestamp}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contracts.map((c) => (
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

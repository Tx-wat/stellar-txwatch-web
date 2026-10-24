'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useContracts } from '@/hooks/useContracts'
import { getAlerts, getContracts, getContracts as getAllContracts, onAlertsChange } from '@/lib/storage'
import { WatchedContract, AlertPayload } from '@/types'
import { formatDate, formatAmount } from '@/lib/format'
import { truncateId, explorerTxUrl } from '@/lib/stellar'
import { Network } from '@/types'
import NetworkBadge from '@/components/NetworkBadge'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export default function GlobalAlertsPage() {
  const { contracts } = useContracts()
  const [allAlerts, setAllAlerts] = useState<AlertPayload[]>([])
  const [mounted, setMounted] = useState(false)
  const [searchHash, setSearchHash] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState<Network | 'all'>('all')
  const [selectedContract, setSelectedContract] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  useEffect(() => {
    const loadAlerts = () => {
      const alerts = loadAllAlerts()
      setAllAlerts(alerts)
      setMounted(true)
    }
    loadAlerts()

    const unsubscribe = onAlertsChange(() => {
      loadAlerts()
    })

    return () => unsubscribe()
  }, [])

  const contractMap = useMemo(() => {
    const map: Record<string, WatchedContract> = {}
    getAllContracts().forEach(c => { map[c.id] = c })
    return map
  }, [])

  const filteredAlerts = useMemo(() => {
    let filtered = [...allAlerts]

    if (selectedNetwork !== 'all') {
      filtered = filtered.filter(a => a.network === selectedNetwork)
    }

    if (selectedContract !== 'all') {
      filtered = filtered.filter(a => a.contract_id === selectedContract)
    }

    if (searchHash) {
      const searchLower = searchHash.toLowerCase()
      filtered = filtered.filter(a => 
        a.transaction_hash.toLowerCase().includes(searchLower)
      )
    }

    filtered.sort((a, b) => 
      sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    )

    return filtered
  }, [allAlerts, selectedNetwork, selectedContract, searchHash, sortOrder])

  const networks = useMemo(() => {
    const nets = new Set(allAlerts.map(a => a.network as Network))
    return ['all', ...nets] as const
  }, [allAlerts])

  const contractOptions = useMemo(() => {
    const contractsWithAlerts = new Set(allAlerts.map(a => a.contract_id))
    return ['all', ...contractsWithAlerts]
  }, [allAlerts])

  if (!mounted) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Global Alert Feed</h1>
          <p className="text-sm text-zinc-500 mt-1">View alerts across all registered contracts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        {/* Search by transaction hash */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <label htmlFor="hash-search" className="sr-only">Search by transaction hash</label>
            <input
              id="hash-search"
              type="text"
              placeholder="Search by transaction hash..."
              value={searchHash}
              onChange={(e) => setSearchHash(e.target.value)}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Network filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="network-filter" className="text-sm text-zinc-400">Network:</label>
            <select
              id="network-filter"
              value={selectedNetwork}
              onChange={(e) => setSelectedNetwork(e.target.value as Network | 'all')}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {networks.map((net) => (
                <option key={net} value={net}>
                  {net === 'all' ? 'All Networks' : net.charAt(0).toUpperCase() + net.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Contract filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="contract-filter" className="text-sm text-zinc-400">Contract:</label>
            <select
              id="contract-filter"
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-w-xs"
            >
              {contractOptions.map((id) => (
                <option key={id} value={id}>
                  {id === 'all' ? 'All Contracts' : contractMap[id]?.label || truncateId(id, 12)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div className="flex items-center gap-2">
            <label htmlFor="sort-order" className="text-sm text-zinc-400">Sort:</label>
            <select
              id="sort-order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-100">{allAlerts.length}</p>
            <p className="text-xs text-zinc-500">Total Alerts</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-100">{filteredAlerts.length}</p>
            <p className="text-xs text-zinc-500">Filtered</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-100">{new Set(allAlerts.map(a => a.contract_id)).size}</p>
            <p className="text-xs text-zinc-500">Contracts</p>
          </div>
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-2xl font-bold text-zinc-100">{new Set(allAlerts.map(a => a.network)).size}</p>
            <p className="text-xs text-zinc-500">Networks</p>
          </div>
        </div>
      </div>

      {/* Alert Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4 max-w-sm">
            <div className="flex justify-center">
              <svg className="w-16 h-16 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-100">No alerts found</h2>
            <p className="text-sm text-zinc-400">
              {searchHash ? 'Try a different transaction hash' : 'No alerts match your filters'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const contract = contractMap[alert.contract_id]
            const network = alert.network as Network
            return (
              <Link
                key={alert.transaction_hash}
                href={`/contracts/${contract?.id || alert.contract_id}`}
                className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <NetworkBadge network={network} size="sm" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-zinc-100 truncate">
                          {contract?.label || truncateId(alert.contract_id, 12)}
                        </p>
                        <NetworkBadge network={network} size="xs" />
                      </div>
                      <p className="text-xs text-zinc-500 truncate font-mono">
                        {alert.transaction_hash}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="text-right">
                      <p className="text-sm font-mono text-zinc-300">{alert.rule_triggered}</p>
                      {alert.amount !== undefined && (
                        <p className="text-xs text-indigo-400">
                          {formatAmount(alert.amount)} XLM
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-300">{formatDate(alert.timestamp)}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination would go here for large datasets */}
    </div>
  )
}

function loadAllAlerts(): AlertPayload[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.ALERTS) ?? '[]')
  } catch {
    return []
  }
}

import { AlertPayload } from '@/types'

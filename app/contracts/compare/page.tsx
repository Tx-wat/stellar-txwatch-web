'use client'

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WatchedContract, AlertPayload } from '@/types'
import { getContracts, getAlerts, onAlertsChange, onContractsChange } from '@/lib/storage'
import WebhookLog from '@/components/WebhookLog'
import NetworkBadge from '@/components/NetworkBadge'
import { truncateId } from '@/lib/stellar'
import EmptyState from '@/components/EmptyState'

function CompareViewContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const paramA = searchParams?.get('a') ?? ''
  const paramB = searchParams?.get('b') ?? ''

  const [contracts, setContracts] = useState<WatchedContract[]>([])
  const [selectedA, setSelectedA] = useState<string>(paramA)
  const [selectedB, setSelectedB] = useState<string>(paramB)
  const [alertsA, setAlertsA] = useState<AlertPayload[]>([])
  const [alertsB, setAlertsB] = useState<AlertPayload[]>([])
  const [syncScroll, setSyncScroll] = useState(true)
  const [mounted, setMounted] = useState(false)

  const scrollRefA = useRef<HTMLDivElement>(null)
  const scrollRefB = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)

  useEffect(() => {
    document.title = 'Compare Contracts · TxWatch'
    const loaded = getContracts()
    setContracts(loaded)
    setMounted(true)

    const unsubContracts = onContractsChange(() => {
      setContracts(getContracts())
    })
    return () => unsubContracts()
  }, [])

  // Sync URL query params into local selection state
  useEffect(() => {
    if (paramA) setSelectedA(paramA)
    if (paramB) setSelectedB(paramB)
  }, [paramA, paramB])

  // Auto-select fallback contracts if none or only one is provided
  useEffect(() => {
    if (!mounted || contracts.length === 0) return
    let nextA = selectedA
    let nextB = selectedB

    if (!nextA && contracts.length >= 1) {
      nextA = contracts[0].id
    }
    if (!nextB && contracts.length >= 2) {
      const other = contracts.find((c: WatchedContract) => c.id !== nextA)
      if (other) nextB = other.id
    }

    if (nextA !== selectedA) setSelectedA(nextA)
    if (nextB !== selectedB) setSelectedB(nextB)
  }, [mounted, contracts, selectedA, selectedB])

  const contractA = useMemo(
    () => contracts.find((c: WatchedContract) => c.id === selectedA || c.contract_id === selectedA) ?? null,
    [contracts, selectedA]
  )

  const contractB = useMemo(
    () => contracts.find((c: WatchedContract) => c.id === selectedB || c.contract_id === selectedB) ?? null,
    [contracts, selectedB]
  )

  // Load alerts for both contracts
  useEffect(() => {
    const loadAlertsForContract = (contract: WatchedContract | null, fallbackId: string): AlertPayload[] => {
      if (!contract && !fallbackId) return []
      const byId = contract ? getAlerts(contract.id) : []
      const byContractId = contract ? getAlerts(contract.contract_id) : getAlerts(fallbackId)
      const combined = [...byId, ...byContractId]
      const seen = new Set<string>()
      return combined.filter((a) => {
        const key = `${a.transaction_hash}-${a.timestamp}-${a.rule_triggered}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    const refresh = () => {
      setAlertsA(loadAlertsForContract(contractA, selectedA))
      setAlertsB(loadAlertsForContract(contractB, selectedB))
    }

    refresh()
    const unsubAlerts = onAlertsChange(refresh)
    return () => unsubAlerts()
  }, [contractA, contractB, selectedA, selectedB])

  // Compute shared timeline axis (descending order so newest timestamps are at the top)
  const sharedTimestamps = useMemo(() => {
    if (!contractA || !contractB) return undefined
    const set = new Set<number>()
    alertsA.forEach((a: AlertPayload) => set.add(a.timestamp))
    alertsB.forEach((b: AlertPayload) => set.add(b.timestamp))
    return Array.from(set).sort((x, y) => y - x)
  }, [contractA, contractB, alertsA, alertsB])

  const updateUrlParams = (newA: string, newB: string) => {
    const params = new URLSearchParams()
    if (newA) params.set('a', newA)
    if (newB) params.set('b', newB)
    if (router?.replace) {
      router.replace(`/contracts/compare?${params.toString()}`)
    }
  }

  const handleSelectA = (id: string) => {
    setSelectedA(id)
    updateUrlParams(id, selectedB)
  }

  const handleSelectB = (id: string) => {
    setSelectedB(id)
    updateUrlParams(selectedA, id)
  }

  const handleSwap = () => {
    const prevA = selectedA
    const prevB = selectedB
    setSelectedA(prevB)
    setSelectedB(prevA)
    updateUrlParams(prevB, prevA)
  }

  const handleScrollA = (e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll || isSyncingScroll.current) return
    if (scrollRefB.current) {
      isSyncingScroll.current = true
      scrollRefB.current.scrollTop = e.currentTarget.scrollTop
      requestAnimationFrame(() => {
        isSyncingScroll.current = false
      })
    }
  }

  const handleScrollB = (e: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll || isSyncingScroll.current) return
    if (scrollRefA.current) {
      isSyncingScroll.current = true
      scrollRefA.current.scrollTop = e.currentTarget.scrollTop
      requestAnimationFrame(() => {
        isSyncingScroll.current = false
      })
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
            <Link href="/contracts" className="hover:text-zinc-200 transition-colors">
              Contracts
            </Link>
            <span>/</span>
            <span className="text-zinc-200">Compare</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-100">Compare Contracts</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Side-by-side alert history aligned on a shared timeline axis
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
            <input
              type="checkbox"
              checked={syncScroll}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncScroll(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
            />
            Sync timeline scroll
          </label>
          <button
            type="button"
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Swap A / B
          </button>
        </div>
      </div>

      {/* Contract Selectors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selector A */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="select-contract-a" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Contract A
            </label>
            {contractA && <NetworkBadge network={contractA.network} />}
          </div>
          <select
            id="select-contract-a"
            aria-label="Contract A"
            value={selectedA}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectA(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a contract...</option>
            {contracts.map((c: WatchedContract) => (
              <option key={c.id} value={c.id}>
                {c.label} ({truncateId(c.contract_id)})
              </option>
            ))}
          </select>
          {contractA && (
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span className="font-mono">{truncateId(contractA.contract_id, 10)}</span>
              <Link
                href={`/contracts/${contractA.id}`}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View details →
              </Link>
            </div>
          )}
        </div>

        {/* Selector B */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="select-contract-b" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Contract B
            </label>
            {contractB && <NetworkBadge network={contractB.network} />}
          </div>
          <select
            id="select-contract-b"
            aria-label="Contract B"
            value={selectedB}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleSelectB(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a contract...</option>
            {contracts.map((c: WatchedContract) => (
              <option key={c.id} value={c.id}>
                {c.label} ({truncateId(c.contract_id)})
              </option>
            ))}
          </select>
          {contractB && (
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <span className="font-mono">{truncateId(contractB.contract_id, 10)}</span>
              <Link
                href={`/contracts/${contractB.id}`}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View details →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Shared Timeline Summary */}
      {contractA && contractB && sharedTimestamps && (
        <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-lg px-4 py-2.5 text-xs text-zinc-400">
          <span>
            Shared timeline axis:{' '}
            <strong className="text-zinc-200">{sharedTimestamps.length}</strong> unique{' '}
            {sharedTimestamps.length === 1 ? 'timestamp' : 'timestamps'}
          </span>
          <span>
            {alertsA.length} alerts ({contractA.label}) vs {alertsB.length} alerts ({contractB.label})
          </span>
        </div>
      )}

      {/* Two-Column Alert History */}
      {!contractA && !contractB ? (
        <EmptyState
          title="Select two contracts to compare"
          description="Choose Contract A and Contract B above to view their alert histories aligned side by side."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="compare-columns">
          {/* Column A */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="font-semibold text-zinc-100 truncate">
                {contractA ? contractA.label : 'No contract selected'}
              </h2>
              <span className="text-xs text-zinc-500">{alertsA.length} alerts</span>
            </div>
            {contractA ? (
              <WebhookLog
                alerts={alertsA}
                network={contractA.network}
                sharedTimestamps={sharedTimestamps}
                scrollContainerRef={scrollRefA}
                onScroll={handleScrollA}
              />
            ) : (
              <p className="text-sm text-zinc-500 py-8 text-center">
                Select Contract A to view its alert history.
              </p>
            )}
          </div>

          {/* Column B */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="font-semibold text-zinc-100 truncate">
                {contractB ? contractB.label : 'No contract selected'}
              </h2>
              <span className="text-xs text-zinc-500">{alertsB.length} alerts</span>
            </div>
            {contractB ? (
              <WebhookLog
                alerts={alertsB}
                network={contractB.network}
                sharedTimestamps={sharedTimestamps}
                scrollContainerRef={scrollRefB}
                onScroll={handleScrollB}
              />
            ) : (
              <p className="text-sm text-zinc-500 py-8 text-center">
                Select Contract B to view its alert history.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CompareContractsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Loading comparison view...</div>}>
      <CompareViewContent />
    </Suspense>
  )
}

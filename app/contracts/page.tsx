'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WatchedContract } from '@/types'
import { getContracts, getAlerts } from '@/lib/storage'
import ContractCard from '@/components/ContractCard'
import EmptyState from '@/components/EmptyState'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<WatchedContract[]>([])
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const filter = searchParams.get('filter')

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

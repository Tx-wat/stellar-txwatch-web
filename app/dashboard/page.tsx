'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useContracts } from '@/lib/useContracts'
import { getTodayAlertCount, getAlerts } from '@/lib/storage'
import ContractCard from '@/components/ContractCard'
import EmptyState from '@/components/EmptyState'
import NetworkBadge from '@/components/NetworkBadge'
import { Network } from '@/types'

export default function DashboardPage() {
  const { contracts } = useContracts()
  const [alertsToday, setAlertsToday] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setAlertsToday(getTodayAlertCount())
    setMounted(true)
  }, [])

  const activeWebhooks = contracts.filter((c) => c.webhook_url).length
  const networkCounts = contracts.reduce<Record<Network, number>>((counts, contract) => {
    counts[contract.network] = (counts[contract.network] ?? 0) + 1
    return counts
  }, {} as Record<Network, number>)
  const networkSummary = (['mainnet', 'testnet', 'futurenet'] as Network[])
    .filter((network) => networkCounts[network])
    .map((network) => ({ network, count: networkCounts[network] }))

  function lastAlertTime(contractId: string): number | undefined {
    const alerts = getAlerts(contractId)
    return alerts[0]?.timestamp
  }

  if (!mounted) return null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Monitor your Soroban contracts in real time</p>
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

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Contracts Watched', value: contracts.length, href: '/contracts' },
          { label: 'Alerts Today', value: alertsToday, href: '/contracts?filter=alerts' },
          { label: 'Active Webhooks', value: activeWebhooks, href: '/contracts?filter=webhooks' },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
            <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
            <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
          </Link>
        ))}

        <Link href="/contracts" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors">
          <p className="text-2xl font-bold text-zinc-100">{Object.keys(networkCounts).length}</p>
          <p className="text-xs text-zinc-500 mt-1">Networks in use</p>
          <div className="mt-4 space-y-2">
            {networkSummary.length > 0 ? (
              networkSummary.map(({ network, count }) => (
                <div key={network} className="flex items-center justify-between rounded-full bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
                  <span className="inline-flex items-center gap-2">
                    <NetworkBadge network={network} />
                    {network.charAt(0).toUpperCase() + network.slice(1)}
                  </span>
                  <span className="font-semibold text-zinc-100">{count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 mt-2">No networks configured yet.</p>
            )}
          </div>
        </Link>
      </div>

      {/* Contract list */}
      {contracts.length === 0 ? (
        <EmptyState
          title="No contracts registered"
          description="Add your first Soroban contract to start monitoring transactions and receiving alerts."
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
            <ContractCard key={c.id} contract={c} lastAlertTime={lastAlertTime(c.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

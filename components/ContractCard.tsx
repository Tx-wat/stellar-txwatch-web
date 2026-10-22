import Link from 'next/link'
import { memo, useEffect, useState } from 'react'
import { WatchedContract } from '@/types'
import NetworkBadge from './NetworkBadge'
import { truncateId } from '@/lib/stellar'
import { formatDate } from '@/lib/format'
import { getTtlWarning } from '@/lib/ttl'

interface ContractCardProps {
  contract: WatchedContract
  lastAlertTime?: number
  highlight?: boolean
  missing?: boolean
}

export default function ContractCard({ contract, lastAlertTime, highlight, missing }: ContractCardProps) {
  const hasWebhook = Boolean(contract.webhook_url)
  const ttlWarning = getTtlWarning(contract.instance_live_until_ledger_seq)
  const [active, setActive] = useState(highlight)
  const { formatDate, isoString, mode } = useTimezone()

  useEffect(() => {
    if (!highlight) return
    setActive(true)
    const id = setTimeout(() => setActive(false), 2500)
    return () => clearTimeout(id)
  }, [highlight])

  return (
    <Link
      href={`/contracts/${contract.id}`}
      className={`block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group ${
        active ? 'ring-2 ring-indigo-500/40 animate-pulse' : ''
      } ${missing ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-100 truncate group-hover:text-white">
            {contract.label}
          </h3>
          <p className="text-xs font-mono text-zinc-500 mt-0.5">
            {truncateId(contract.contract_id)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <NetworkBadge network={contract.network} />
          {missing && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/20">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Not found — network may have been reset</span>
            </span>
          )}
        </div>
      </div>

      {/* Instance TTL warning indicator */}
      {ttlWarning && (
        <div
          className={`mb-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
            ttlWarning.level === 'critical'
              ? 'bg-red-500/15 text-red-400 border-red-500/20'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
          }`}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {ttlWarning.level === 'critical' ? 'Instance expires soon' : 'Instance expiring soon'}
            {' · '}
            {ttlWarning.daysRemaining <= 0
              ? 'expired'
              : `~${Math.ceil(ttlWarning.daysRemaining)}d left`}
          </span>
        </div>
      )}

      {/* Webhook status indicator */}
      {!hasWebhook && (
        <div className="mb-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>No webhook configured</span>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          <span className="text-zinc-300 font-medium">{contract.rules.length}</span>{' '}
          {contract.rules.length === 1 ? 'rule' : 'rules'} {isPaused ? 'paused' : 'active'}
        </span>
        {lastAlertTime ? (
          <span title={isoString(lastAlertTime)}>
            Last alert {formatDate(lastAlertTime)}{mode === 'utc' ? ' UTC' : ''}
          </span>
        ) : (
          <span>No alerts yet</span>
        )}
      </div>
    </Link>
  )
}

// Skip re-rendering cards whose contract, alert time and highlight are unchanged
export default memo(ContractCard)

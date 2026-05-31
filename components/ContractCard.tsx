import Link from 'next/link'
import { WatchedContract } from '@/types'
import NetworkBadge from './NetworkBadge'
import { truncateId } from '@/lib/stellar'
import { formatDate } from '@/lib/format'

interface ContractCardProps {
  contract: WatchedContract
  lastAlertTime?: number
}

export default function ContractCard({ contract, lastAlertTime }: ContractCardProps) {
  const hasWebhook = Boolean(contract.webhook_url)

  return (
    <Link
      href={`/contracts/${contract.id}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group"
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
        <NetworkBadge network={contract.network} />
      </div>

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
          {contract.rules.length === 1 ? 'rule' : 'rules'} active
        </span>
        {lastAlertTime ? (
          <span>Last alert {formatDate(lastAlertTime)}</span>
        ) : (
          <span>No alerts yet</span>
        )}
      </div>
    </Link>
  )
}

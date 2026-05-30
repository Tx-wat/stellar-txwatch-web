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

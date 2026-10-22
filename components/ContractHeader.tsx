'use client'

import { WatchedContract } from '@/types'
import { truncateId, explorerContractUrl } from '@/lib/stellar'
import NetworkBadge from '@/components/NetworkBadge'
import CopyButton from '@/components/CopyButton'

interface ContractHeaderProps {
  contract: WatchedContract
  onEditDetails: () => void
  onEditRules: () => void
  onDelete: () => void
}

export default function ContractHeader({
  contract,
  onEditDetails,
  onEditRules,
  onDelete,
}: ContractHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-zinc-100">{contract.label}</h1>
          <NetworkBadge network={contract.network} />
        </div>
        <div className="flex items-center gap-2">
          <a
            href={explorerContractUrl(contract.network, contract.contract_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors break-all"
          >
            {truncateId(contract.contract_id, 12)}
          </a>
          <CopyButton text={contract.contract_id} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
        <button
          onClick={onEditDetails}
          className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          Edit Details
        </button>
        <button
          onClick={onEditRules}
          className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          Edit Rules
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 rounded-lg border border-red-800 hover:border-red-600 text-sm text-red-400 hover:text-red-300 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

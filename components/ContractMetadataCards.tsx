'use client'

import { AlertPayload, WatchedContract } from '@/types'
import { formatDate } from '@/lib/format'
import CopyButton from '@/components/CopyButton'

interface ContractMetadataCardsProps {
  contract: WatchedContract
  alerts: AlertPayload[]
}

export default function ContractMetadataCards({ contract, alerts }: ContractMetadataCardsProps) {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {/* Webhook URL */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-zinc-500">Webhook URL</p>
          <CopyButton text={contract.webhook_url} />
        </div>
        <a
          href={contract.webhook_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors break-all"
        >
          {contract.webhook_url}
        </a>
      </div>

      {/* Registered */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-1">Registered</p>
        <p className="text-sm text-zinc-300">{formatDate(contract.created_at)}</p>
        <p className="text-xs text-zinc-500 mt-1">
          {new Date(contract.created_at).toLocaleTimeString()}
        </p>
      </div>

      {/* Last Alert / Total Alerts */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-500 mb-1">
          {alerts.length === 0 ? 'Total Alerts' : 'Last Alert'}
        </p>
        {alerts.length === 0 ? (
          <p className="text-sm text-zinc-300">No alerts yet</p>
        ) : (
          <>
            <p className="text-sm text-zinc-300">{formatDate(alerts[0].timestamp)}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {new Date(alerts[0].timestamp).toLocaleTimeString()}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

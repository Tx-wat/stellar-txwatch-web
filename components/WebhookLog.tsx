import { AlertPayload } from '@/types'
import { explorerTxUrl } from '@/lib/stellar'
import { Network } from '@/types'
import EmptyState from './EmptyState'
import { formatId, formatDateTime } from '@/lib/format'

interface WebhookLogProps {
  alerts: AlertPayload[]
  network: Network
}

export default function WebhookLog({ alerts, network }: WebhookLogProps) {
  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts yet"
        description="Alerts will appear here once your contract triggers a matching rule."
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left">
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Time</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Rule</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tx Hash</th>
            <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Function</th>
            <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {alerts.map((alert, i) => (
            <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
              <td className="py-3 pr-4 text-zinc-400 whitespace-nowrap">
                {formatDateTime(alert.timestamp)}
              </td>
              <td className="py-3 pr-4">
                <span className="text-zinc-300">{alert.rule_triggered}</span>
              </td>
              <td className="py-3 pr-4">
                <a
                  href={explorerTxUrl(network, alert.transaction_hash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {formatId(alert.transaction_hash)}
                </a>
              </td>
              <td className="py-3 pr-4 font-mono text-zinc-400">
                {alert.function_name ?? '-'}
              </td>
              <td className="py-3 text-zinc-400">
                {alert.amount !== undefined ? `${alert.amount} XLM` : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

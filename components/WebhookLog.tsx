import { AlertPayload } from '@/types'
import { explorerTxUrl } from '@/lib/stellar'
import { Network } from '@/types'
import EmptyState from './EmptyState'
import { formatId, formatDateTime } from '@/lib/format'
import CopyButton from './CopyButton'

interface WebhookLogProps {
  alerts: AlertPayload[]
  network: Network
}

function exportCSV(alerts: AlertPayload[]) {
  const rows = [
    ['Time', 'Rule', 'Tx Hash', 'Function', 'Amount'],
    ...alerts.map((a) => [
      new Date(a.timestamp).toLocaleString(),
      a.rule_triggered,
      a.transaction_hash,
      a.function_name ?? 'N/A',
      a.amount !== undefined ? `${a.amount} XLM` : 'N/A',
    ]),
  ]
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'alerts.csv'
  a.click()
  URL.revokeObjectURL(url)
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
      <div className="flex justify-end mb-2">
        <button
          onClick={() => exportCSV(alerts)}
          className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Export CSV
        </button>
      </div>
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
                <div className="flex items-center gap-1.5">
                  <a
                    href={explorerTxUrl(network, alert.transaction_hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {formatId(alert.transaction_hash)}
                  </a>
                  <CopyButton text={alert.transaction_hash} />
                </div>
              </td>
              <td className="py-3 pr-4 font-mono text-zinc-400">
                {alert.function_name ?? 'N/A'}
              </td>
              <td className="py-3 text-zinc-400">
                {alert.amount !== undefined ? `${alert.amount} XLM` : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

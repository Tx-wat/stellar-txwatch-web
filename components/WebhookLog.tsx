'use client'

import { AlertPayload, AlertRuleType } from '@/types'
import { explorerTxUrl } from '@/lib/stellar'
import { Network } from '@/types'
import EmptyState from './EmptyState'
import { truncateId } from '@/lib/stellar'
import { formatDateTime } from '@/lib/format'
import { useState } from 'react'
import AlertRuleBadge from './AlertRuleBadge'
import CopyButton from './CopyButton'

interface WebhookLogProps {
  alerts: AlertPayload[]
  network: Network
}

const ruleTypes: AlertRuleType[] = [
  'LargeTransfer',
  'AdminFunctionCalled',
  'AnyTransaction',
  'FunctionCalled',
  'TransactionFailed',
]

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
  const [selectedFilter, setSelectedFilter] = useState<AlertRuleType | null>(null)
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  const filteredAlerts = selectedFilter
    ? alerts.filter((a) => a.rule_triggered === selectedFilter)
    : alerts

  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts yet"
        description="Alerts will appear here once your contract triggers a matching rule."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedFilter === null
              ? 'bg-indigo-600 text-white'
              : 'border border-zinc-700 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          All Rules
        </button>
        {ruleTypes.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedFilter === type
                ? 'bg-indigo-600 text-white'
                : 'border border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Export and Results */}
      <div className="overflow-x-auto">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-zinc-500">
            {filteredAlerts.length} of {alerts.length} alerts
          </span>
          <button
            onClick={() => exportCSV(filteredAlerts)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Export CSV
          </button>
        </div>
        {filteredAlerts.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">No alerts match the selected filter.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Time</th>
                <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Rule</th>
                <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Tx Hash</th>
                <th className="pb-3 pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">Function</th>
                <th className="pb-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Amount</th>
                <th className="pb-3 w-6" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredAlerts.map((alert, i) => {
                const isExpanded = expandedRow === i
                const json = JSON.stringify(alert, null, 2)
                return (
                  <>
                    <tr
                      key={i}
                      onClick={() => setExpandedRow(isExpanded ? null : i)}
                      className="hover:bg-zinc-800/30 transition-colors cursor-pointer select-none"
                    >
                      <td className="py-3 pr-4 text-zinc-400 whitespace-nowrap">
                        {formatDateTime(alert.timestamp)}
                      </td>
                      <td className="py-3 pr-4">
                        <AlertRuleBadge type={alert.rule_triggered as AlertRuleType} />
                      </td>
                      <td className="py-3 pr-4">
                        <a
                          href={explorerTxUrl(network, alert.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {truncateId(alert.transaction_hash)}
                        </a>
                      </td>
                      <td className="py-3 pr-4 font-mono text-zinc-400">
                        {alert.function_name ?? 'N/A'}
                      </td>
                      <td className="py-3 text-zinc-400">
                        {alert.amount !== undefined ? `${alert.amount} XLM` : 'N/A'}
                      </td>
                      <td className="py-3 pl-2 text-zinc-600">
                        <svg
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${i}-expanded`} className="bg-zinc-900/60">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="relative">
                            <div className="absolute top-2 right-2">
                              <CopyButton text={json} />
                            </div>
                            <pre className="text-xs font-mono text-zinc-300 bg-zinc-950 rounded-lg p-4 pr-8 overflow-x-auto whitespace-pre-wrap break-all">
                              {json}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

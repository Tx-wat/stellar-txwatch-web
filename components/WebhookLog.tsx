'use client'

import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertPayload, AlertRuleType } from '@/types'
import { explorerTxUrl, truncateId } from '@/lib/stellar'
import { Network } from '@/types'
import EmptyState from './EmptyState'
import { formatDateTime } from '@/lib/format'
import { useState } from 'react'
import AlertRuleBadge from './AlertRuleBadge'

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

// CSV export always operates on the full filtered set, not just the visible window.
function exportCSV(alerts: AlertPayload[]) {
  const rows = [
    ['Time', 'Rule', 'Rule Name', 'Tx Hash', 'Function', 'Amount'],
    ...alerts.map((a) => [
      new Date(a.timestamp).toLocaleString(),
      a.rule_triggered,
      a.rule_name ?? '',
      a.transaction_hash,
      a.function_name ?? 'N/A',
      a.amount !== undefined ? `${a.amount} XLM` : 'N/A',
      a.delivery_status ?? 'unknown',
      a.delivery_retry_count !== undefined ? String(a.delivery_retry_count) : 'N/A',
      a.delivery_last_attempt ? new Date(a.delivery_last_attempt).toLocaleString() : 'N/A',
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

// Fixed row height in px — keep in sync with the row className below.
const ROW_HEIGHT = 48

// Height of the scrollable viewport. Shows ~10 rows before scrolling.
const VIEWPORT_HEIGHT = 480

export default function WebhookLog({ alerts, network }: WebhookLogProps) {
  const [selectedFilter, setSelectedFilter] = useState<AlertRuleType | null>(null)
  const { formatDateTime, isoString, mode, toggleMode } = useTimezone()

  // Filtering operates on the full alerts array; only rendering is virtualised.
  const filteredAlerts = selectedFilter
    ? alerts.filter((a) => a.rule_triggered === selectedFilter)
    : alerts

  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: filteredAlerts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  if (alerts.length === 0) {
    return (
      <EmptyState
        title="No alerts yet"
        description="Alerts will appear here once your contract triggers a matching rule."
      />
    )
  }

  const persistentFailures = alerts.filter((a) => a.delivery_status === 'failed').length

  return (
    <div className="space-y-4">
      {persistentFailures > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {persistentFailures} webhook {persistentFailures === 1 ? 'delivery has' : 'deliveries have'} persistently failed.
            Check your endpoint and alert rules.
          </span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search tx hash..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
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
          {/* exportCSV receives the full filtered set, not the virtual window */}
          <button
            onClick={() => exportCSV(filteredAlerts)}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Export CSV
          </button>
        </div>

        {filteredAlerts.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">
            No matching alerts{searchQuery ? ` for "${searchQuery}"` : ''}.
          </p>
        ) : (
          /*
           * We use a div-based grid layout instead of a native <table> so that
           * react-virtual can absolutely position rows inside a single tall
           * container without breaking table semantics.  The visual appearance
           * is identical to the previous <table> implementation.
           */
          <div role="table" aria-label="Alert history" className="w-full text-sm min-w-[640px]">
            {/* Header */}
            <div
              role="row"
              className="grid border-b border-zinc-800 pb-3 mb-0"
              style={{ gridTemplateColumns: '160px 180px 1fr 140px 120px' }}
            >
              {['Time', 'Rule', 'Tx Hash', 'Function', 'Amount'].map((h) => (
                <div
                  key={h}
                  role="columnheader"
                  className="pr-4 text-xs font-medium text-zinc-500 uppercase tracking-wider"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Virtualised scrollable body */}
            <div
              ref={parentRef}
              role="rowgroup"
              style={{ height: VIEWPORT_HEIGHT, overflowY: 'auto' }}
            >
              {/* Total height spacer — tells the browser the true scroll height */}
              <div
                style={{
                  height: virtualizer.getTotalSize(),
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const alert = filteredAlerts[virtualRow.index]
                  return (
                    <div
                      key={virtualRow.key}
                      role="row"
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      className="grid hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        minHeight: ROW_HEIGHT,
                        alignItems: 'center',
                        gridTemplateColumns: '160px 180px 1fr 140px 120px',
                      }}
                    >
                      <div role="cell" className="pr-4 text-zinc-400 whitespace-nowrap text-xs">
                        {formatDateTime(alert.timestamp)}
                      </div>
                      <div role="cell" className="pr-4 flex flex-col gap-0.5 justify-center">
                        <AlertRuleBadge type={alert.rule_triggered as AlertRuleType} />
                        {alert.rule_name && (
                          <span className="text-xs text-zinc-400 truncate" title={alert.rule_name}>
                            {alert.rule_name}
                          </span>
                        )}
                      </div>
                      <div role="cell" className="pr-4">
                        <a
                          href={explorerTxUrl(network, alert.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          {truncateId(alert.transaction_hash)}
                        </a>
                      </div>
                      <div role="cell" className="pr-4 font-mono text-zinc-400 text-xs truncate">
                        {alert.function_name ?? 'N/A'}
                      </div>
                      <div role="cell" className="text-zinc-400 text-xs">
                        {alert.amount !== undefined ? `${alert.amount} XLM` : 'N/A'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

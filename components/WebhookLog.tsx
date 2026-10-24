'use client'

import React, { useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { AlertPayload, AlertRuleType, Network } from '@/types'
import { explorerTxUrl, truncateId } from '@/lib/stellar'
import EmptyState from './EmptyState'
import { formatDateTime as defaultFormatDateTime } from '@/lib/format'
import { useTimezone } from './TimezoneProvider'
import AlertRuleBadge from './AlertRuleBadge'
import CopyButton from './CopyButton'

interface WebhookLogProps {
  alerts: AlertPayload[]
  network: Network
  /** Optional shared timeline timestamps (sorted) to align rows across side-by-side logs. */
  sharedTimestamps?: number[]
  /** Optional ref for the scrollable container (e.g. for scroll synchronization). */
  scrollContainerRef?: React.RefObject<HTMLDivElement>
  /** Optional scroll event handler for synchronized scrolling. */
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
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

export default function WebhookLog({
  alerts,
  network,
  sharedTimestamps,
  scrollContainerRef,
  onScroll,
}: WebhookLogProps) {
  const [selectedFilter, setSelectedFilter] = useState<AlertRuleType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  let formatDateTime = defaultFormatDateTime
  try {
    const tz = useTimezone()
    formatDateTime = tz.formatDateTime
  } catch {
    // Fallback when rendered outside TimezoneProvider (e.g. in unit tests)
  }

  // Filtering operates on the full alerts array; only rendering is virtualised.
  const filteredAlerts = alerts.filter((a: AlertPayload) => {
    if (selectedFilter && a.rule_triggered !== selectedFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      if (!a.transaction_hash.toLowerCase().includes(q)) return false
    }
    return true
  })

  // When sharedTimestamps is provided, align rows to the shared timeline axis
  const timelineSlots: { timestamp: number; alert: AlertPayload | null }[] = sharedTimestamps
    ? sharedTimestamps.map((ts: number) => ({
        timestamp: ts,
        alert: filteredAlerts.find((a: AlertPayload) => a.timestamp === ts) ?? null,
      }))
    : filteredAlerts.map((a: AlertPayload) => ({ timestamp: a.timestamp, alert: a }))

  const internalRef = useRef<HTMLDivElement>(null)
  const parentRef = scrollContainerRef ?? internalRef

  const virtualizer = useVirtualizer({
    count: timelineSlots.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  const virtualItems = virtualizer.getVirtualItems()
  // In non-layout environments (e.g. jsdom in unit tests), getVirtualItems() may be empty
  // because container dimensions are 0; fall back to rendering all items directly.
  const rowsToRender =
    virtualItems.length > 0
      ? virtualItems.map((v: { key: React.Key; index: number; start: number }) => ({
          key: v.key,
          index: v.index,
          start: v.start,
          slot: timelineSlots[v.index],
          virtual: true,
        }))
      : timelineSlots.map((slot, index) => ({
          key: index,
          index,
          start: index * ROW_HEIGHT,
          slot,
          virtual: false,
        }))

  if (alerts.length === 0 && (!sharedTimestamps || sharedTimestamps.length === 0)) {
    return (
      <EmptyState
        title="No alerts yet"
        description="Alerts will appear here once your contract triggers a matching rule."
      />
    )
  }

  const persistentFailures = alerts.filter((a: AlertPayload) => a.delivery_status === 'failed').length

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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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

      {/* Search by transaction hash */}
      <div className="flex justify-end mb-2">
        <input
          type="text"
          placeholder="Search transaction hash…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
        />
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

        {filteredAlerts.length === 0 && !sharedTimestamps ? (
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
              onScroll={onScroll}
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
                {rowsToRender.map((row) => {
                  const { slot } = row
                  const alert = slot.alert
                  const isKnownRule = ruleTypes.includes(alert?.rule_triggered as AlertRuleType)
                  return (
                    <div
                      key={row.key}
                      role="row"
                      data-index={row.index}
                      data-timestamp={slot.timestamp}
                      ref={row.virtual ? virtualizer.measureElement : undefined}
                      className="grid hover:bg-zinc-800/30 transition-colors border-b border-zinc-800/50"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${row.start}px)`,
                        minHeight: ROW_HEIGHT,
                        alignItems: 'center',
                        gridTemplateColumns: '160px 180px 1fr 140px 120px',
                      }}
                    >
                      <div role="cell" className="pr-4 text-zinc-400 whitespace-nowrap text-xs">
                        {formatDateTime(slot.timestamp)}
                      </div>
                      {alert ? (
                        <>
                          <div role="cell" className="pr-4 flex flex-col gap-0.5 justify-center">
                            {isKnownRule ? (
                              <AlertRuleBadge type={alert.rule_triggered as AlertRuleType} />
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-zinc-800 text-zinc-300 border-zinc-700 w-fit">
                                {alert.rule_triggered}
                              </span>
                            )}
                            {alert.rule_name && (
                              <span className="text-xs text-zinc-400 truncate" title={alert.rule_name}>
                                {alert.rule_name}
                              </span>
                            )}
                          </div>
                          <div role="cell" className="pr-4 flex items-center gap-1.5">
                            <a
                              href={explorerTxUrl(network, alert.transaction_hash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              {truncateId ? truncateId(alert.transaction_hash) : alert.transaction_hash}
                            </a>
                            <CopyButton text={alert.transaction_hash} />
                          </div>
                          <div role="cell" className="pr-4 font-mono text-zinc-400 text-xs truncate">
                            {alert.function_name ?? 'N/A'}
                          </div>
                          <div role="cell" className="text-zinc-400 text-xs">
                            {alert.amount !== undefined ? `${alert.amount} XLM` : 'N/A'}
                          </div>
                        </>
                      ) : (
                        <div
                          role="cell"
                          className="col-span-4 text-zinc-600 text-xs italic"
                          style={{ gridColumn: '2 / -1' }}
                        >
                          — No alert at this timestamp —
                        </div>
                      )}
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

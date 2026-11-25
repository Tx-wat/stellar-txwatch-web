'use client'

import { AlertRuleType } from '@/types'
import { useState } from 'react'

interface AlertRuleBadgeProps {
  type: AlertRuleType
  /** Optional token (SAC/token contract ID) for token-denominated LargeTransfer thresholds */
  asset?: string
}

const styles: Record<AlertRuleType, string> = {
  LargeTransfer: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  AdminFunctionCalled: 'bg-red-500/20 text-red-400 border-red-500/30',
  AnyTransaction: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FunctionCalled: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  TransactionFailed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  HighFee: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

const labels: Record<AlertRuleType, string> = {
  LargeTransfer: 'Large Transfer',
  AdminFunctionCalled: 'Admin Function',
  AnyTransaction: 'Any Transaction',
  FunctionCalled: 'Function Called',
  TransactionFailed: 'Tx Failed',
  HighFee: 'High Fee',
}

const descriptions: Record<AlertRuleType, string> = {
  LargeTransfer: 'Alert when a transfer exceeds the specified XLM threshold',
  AdminFunctionCalled: 'Alert when admin-level functions are invoked',
  AnyTransaction: 'Alert on any transaction involving this contract',
  FunctionCalled: 'Alert when specific functions are called',
  TransactionFailed: 'Alert when a transaction fails',
  HighFee: 'Alert when a transaction fee exceeds the specified stroops threshold',
}

let tooltipIdCounter = 0

export default function AlertRuleBadge({ type, asset }: AlertRuleBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipId] = useState(() => `alert-rule-tooltip-${++tooltipIdCounter}`)

  const description =
    type === 'LargeTransfer' && asset
      ? 'Alert when a transfer exceeds the specified token threshold'
      : descriptions[type]

  return (
    <div className="relative inline-block">
      <span
        tabIndex={0}
        role="img"
        aria-describedby={tooltipId}
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border cursor-help focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${styles[type]}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
      >
        {labels[type]}
      </span>
      {showTooltip && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 whitespace-nowrap z-10 pointer-events-none"
        >
          {description}
        </div>
      )}
    </div>
  )
}

'use client'

import { AlertRuleType } from '@/types'
import { useState } from 'react'

const styles: Record<AlertRuleType, string> = {
  LargeTransfer: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  AdminFunctionCalled: 'bg-red-500/20 text-red-400 border-red-500/30',
  AnyTransaction: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FunctionCalled: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  TransactionFailed: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

const labels: Record<AlertRuleType, string> = {
  LargeTransfer: 'Large Transfer',
  AdminFunctionCalled: 'Admin Function',
  AnyTransaction: 'Any Transaction',
  FunctionCalled: 'Function Called',
  TransactionFailed: 'Tx Failed',
}

const descriptions: Record<AlertRuleType, string> = {
  LargeTransfer: 'Alert when a transfer exceeds the specified XLM threshold',
  AdminFunctionCalled: 'Alert when admin-level functions are invoked',
  AnyTransaction: 'Alert on any transaction involving this contract',
  FunctionCalled: 'Alert when specific functions are called',
  TransactionFailed: 'Alert when a transaction fails',
}

export default function AlertRuleBadge({ type }: { type: AlertRuleType }) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative inline-block">
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border cursor-help ${styles[type]}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {labels[type]}
      </span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 whitespace-nowrap z-10 pointer-events-none">
          {descriptions[type]}
        </div>
      )}
    </div>
  )
}

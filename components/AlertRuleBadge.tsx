import { AlertRuleType } from '@/types'

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

export default function AlertRuleBadge({ type }: { type: AlertRuleType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[type]}`}>
      {labels[type]}
    </span>
  )
}

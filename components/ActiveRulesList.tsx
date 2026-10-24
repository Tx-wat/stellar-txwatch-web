'use client'

import { AlertRule } from '@/types'
import { formatRuleSummary } from '@/lib/format'
import AlertRuleBadge from '@/components/AlertRuleBadge'

interface ActiveRulesListProps {
  rules: AlertRule[]
}

export default function ActiveRulesList({ rules }: ActiveRulesListProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-zinc-100 mb-3">Active Rules</h2>
      {rules.length === 0 ? (
        <p className="text-sm text-zinc-500">No rules configured.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rules.map((rule, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2"
            >
              <AlertRuleBadge type={rule.type} />
              {rule.name && (
                <span className="text-xs font-medium text-zinc-200">{rule.name}</span>
              )}
              {formatRuleSummary(rule) && (
                <span className="text-xs font-mono text-zinc-400">{formatRuleSummary(rule)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

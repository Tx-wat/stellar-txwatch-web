'use client'

import { useState } from 'react'
import { AlertRule, AlertRuleType } from '@/types'
import AlertRuleBadge from './AlertRuleBadge'

const RULE_TYPES: AlertRuleType[] = [
  'AnyTransaction',
  'LargeTransfer',
  'FunctionCalled',
  'AdminFunctionCalled',
  'TransactionFailed',
]

interface RuleBuilderProps {
  rules: AlertRule[]
  onChange: (rules: AlertRule[]) => void
}

const emptyRule = (): AlertRule => ({ type: 'AnyTransaction' })

export default function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  const [draft, setDraft] = useState<AlertRule>(emptyRule())
  const [error, setError] = useState<string | null>(null)

  function updateDraft(patch: Partial<AlertRule>) {
    setDraft((prev) => ({ ...prev, ...patch }))
    setError(null)
  }

  function handleTypeChange(type: AlertRuleType) {
    setDraft({ type })
    setError(null)
  }

  function addRule() {
    if (draft.type === 'LargeTransfer') {
      if (!draft.threshold_xlm || draft.threshold_xlm <= 0) {
        setError('Enter a positive XLM threshold')
        return
      }
    }
    if (draft.type === 'FunctionCalled') {
      if (!draft.function_name?.trim()) {
        setError('Enter a function name')
        return
      }
    }
    if (draft.type === 'AdminFunctionCalled') {
      if (!draft.function_names?.length) {
        setError('Enter at least one function name')
        return
      }
    }
    onChange([...rules, draft])
    setDraft(emptyRule())
    setError(null)
  }

  function removeRule(index: number) {
    onChange(rules.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">Rule Type</label>
          <select
            value={draft.type}
            onChange={(e) => handleTypeChange(e.target.value as AlertRuleType)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
          >
            {RULE_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {draft.type === 'LargeTransfer' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Threshold (XLM)</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. 10000"
              value={draft.threshold_xlm ?? ''}
              onChange={(e) => updateDraft({ threshold_xlm: parseFloat(e.target.value) || undefined })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {draft.type === 'FunctionCalled' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Function Name</label>
            <input
              type="text"
              placeholder="e.g. transfer"
              value={draft.function_name ?? ''}
              onChange={(e) => updateDraft({ function_name: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {draft.type === 'AdminFunctionCalled' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Function Names <span className="text-zinc-600">(comma separated)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. set_admin, upgrade, migrate"
              value={draft.function_names?.join(', ') ?? ''}
              onChange={(e) =>
                updateDraft({
                  function_names: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={addRule}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Rule
        </button>
      </div>

      {rules.length > 0 && (
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={i} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <AlertRuleBadge type={rule.type} />
                {rule.threshold_xlm !== undefined && (
                  <span className="text-xs text-zinc-400">&gt;= {rule.threshold_xlm} XLM</span>
                )}
                {rule.function_name && (
                  <span className="text-xs font-mono text-zinc-400">{rule.function_name}</span>
                )}
                {rule.function_names?.length ? (
                  <span className="text-xs font-mono text-zinc-400">{rule.function_names.join(', ')}</span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors ml-2"
                aria-label="Remove rule"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

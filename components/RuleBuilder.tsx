'use client'

import { useState } from 'react'
import { AlertRule, AlertRuleType } from '@/types'
import { formatRuleSummary } from '@/lib/format'
import AlertRuleBadge from './AlertRuleBadge'

const RULE_TYPES: AlertRuleType[] = [
  'AnyTransaction',
  'LargeTransfer',
  'FunctionCalled',
  'AdminFunctionCalled',
  'TransactionFailed',
]

const RULE_EXAMPLES: Record<AlertRuleType, string> = {
  'AnyTransaction': 'Alert on every transaction',
  'LargeTransfer': 'Alert when transfer amount exceeds threshold',
  'FunctionCalled': 'Alert when a specific function is called',
  'AdminFunctionCalled': 'Alert when admin functions are called',
  'TransactionFailed': 'Alert on failed transactions',
}

interface RuleBuilderProps {
  rules: AlertRule[]
  onChange: (rules: AlertRule[]) => void
}

const emptyRule = (): AlertRule => ({ type: 'AnyTransaction' })

function rulesEqual(a: AlertRule, b: AlertRule): boolean {
  if (a.type !== b.type) return false
  if (a.threshold_xlm !== b.threshold_xlm) return false
  if (a.function_name !== b.function_name) return false
  if (!a.function_names && !b.function_names) return true
  if (!a.function_names || !b.function_names) return false
  return a.function_names.length === b.function_names.length &&
    a.function_names.every((f, i) => f === b.function_names![i])
}

export default function RuleBuilder({ rules, onChange }: RuleBuilderProps) {
  const [draft, setDraft] = useState<AlertRule>(emptyRule())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  function updateDraft(patch: Partial<AlertRule>) {
    setDraft((prev) => ({ ...prev, ...patch }))
    setError(null)
    setWarning(null)
  }

  function handleTypeChange(type: AlertRuleType) {
    setDraft({ type })
    setError(null)
    setWarning(null)
  }

  function isDuplicateLabel(newRule: AlertRule): boolean {
    return rules.some((rule) => {
      if (newRule.type !== rule.type) return false
      if (newRule.type === 'LargeTransfer') return newRule.threshold_xlm === rule.threshold_xlm
      if (newRule.type === 'FunctionCalled') return newRule.function_name === rule.function_name
      if (newRule.type === 'AdminFunctionCalled') {
        const newNames = (newRule.function_names ?? []).sort().join(',')
        const existingNames = (rule.function_names ?? []).sort().join(',')
        return newNames === existingNames
      }
      return true // AnyTransaction and TransactionFailed
    })
  }

  function isValidFunctionName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)
  }

  function addRule() {
    if (draft.type === 'LargeTransfer') {
      if (draft.threshold_xlm === undefined || draft.threshold_xlm === null || isNaN(draft.threshold_xlm)) {
        setError('Enter a valid XLM threshold')
        return
      }
      if (draft.threshold_xlm <= 0) {
        setError('Threshold must be greater than 0')
        return
      }
    }
    if (draft.type === 'FunctionCalled') {
      if (!draft.function_name?.trim()) {
        setError('Enter a function name')
        return
      }
      if (!isValidFunctionName(draft.function_name.trim())) {
        setError('Function name must start with a letter or underscore, contain only alphanumeric characters and underscores')
        return
      }
    }
    if (draft.type === 'AdminFunctionCalled') {
      if (!draft.function_names?.length) {
        setError('Enter at least one function name')
        return
      }
      // Sort function names for consistency
      draft.function_names = [...draft.function_names].sort()
    }
    if (editingIndex !== null) {
      const updated = [...rules]
      updated[editingIndex] = draft
      onChange(updated)
      setEditingIndex(null)
    } else {
      if (isDuplicateLabel(draft)) {
        setWarning('This rule already exists')
        return
      }
      onChange([...rules, draft])
    }
    setDraft(emptyRule())
    setError(null)
    setWarning(null)
  }

  function startEdit(index: number) {
    setDraft(rules[index])
    setEditingIndex(index)
    setError(null)
  }

  function cancelEdit() {
    setDraft(emptyRule())
    setEditingIndex(null)
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
          <p className="text-xs text-zinc-500 mt-1">{RULE_EXAMPLES[draft.type]}</p>
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
        {warning && <p className="text-xs text-amber-400">{warning}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {editingIndex !== null ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingIndex !== null && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-medium text-white transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {rules.length > 0 && (
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${editingIndex === i ? 'bg-indigo-900/30 border-indigo-600' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <AlertRuleBadge type={rule.type} />
                {formatRuleSummary(rule) && (
                  <span className="text-xs font-mono text-zinc-400">{formatRuleSummary(rule)}</span>
                )}
              </div>
              <div className="flex gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => startEdit(i)}
                  className="text-zinc-600 hover:text-indigo-400 transition-colors"
                  aria-label="Edit rule"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="text-zinc-600 hover:text-red-400 transition-colors"
                  aria-label="Remove rule"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

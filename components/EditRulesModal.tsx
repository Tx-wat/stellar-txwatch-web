'use client'

import { useState } from 'react'
import { AlertRule } from '@/types'
import RuleBuilder from '@/components/RuleBuilder'

interface EditRulesModalProps {
  initialRules: AlertRule[]
  onSave: (rules: AlertRule[]) => void
  onClose: () => void
  onRuleEvent?: (rules: AlertRule[], action: 'add' | 'update' | 'remove') => void
}

/** Returns a validation error message for a rule, or null if it is valid. */
export function validateRule(rule: AlertRule): string | null {
  switch (rule.type) {
    case 'LargeTransfer':
      if (!rule.threshold_xlm || rule.threshold_xlm <= 0) {
        return 'Threshold must be a positive number'
      }
      return null
    case 'FunctionCalled':
      if (!rule.function_name || rule.function_name.trim() === '') {
        return 'Function name is required'
      }
      return null
    case 'AdminFunctionCalled':
      if (!rule.function_names || rule.function_names.length === 0) {
        return 'At least one function name is required'
      }
      return null
    case 'AnyTransaction':
    case 'TransactionFailed':
      return null
    default:
      return null
  }
}

export default function EditRulesModal({
  initialRules,
  onSave,
  onClose,
  onRuleEvent,
}: EditRulesModalProps) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules)
  const [error, setError] = useState<string | null>(null)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  const ruleErrors = rules.map(validateRule)
  const hasInvalidRules = ruleErrors.some((e) => e !== null)

  function handleSave() {
    if (rules.length === 0) { setError('Add at least one rule'); return }
    if (hasInvalidRules) { setError('Fix the highlighted rule errors before saving'); return }
    setError(null)
    onSave(rules)
  }

  function handleCancel() {
    const isDirty = JSON.stringify(rules) !== JSON.stringify(initialRules)
    if (isDirty) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-zinc-100">Edit Alert Rules</h3>
          <RuleBuilder
            rules={rules}
            onChange={setRules}
            onRulesChanged={onRuleEvent}
          />
          {ruleErrors.some((e) => e !== null) && (
            <ul className="space-y-1" data-testid="rule-validation-errors">
              {ruleErrors.map((ruleError, i) =>
                ruleError ? (
                  <li key={i} className="text-xs text-red-400">
                    Rule {i + 1}: {ruleError}
                  </li>
                ) : null
              )}
            </ul>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={hasInvalidRules}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              Save Rules
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Discard-changes confirmation */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100">Discard Changes?</h3>
            <p className="text-sm text-zinc-400">
              You have unsaved changes to your alert rules. Are you sure you want to discard them?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowUnsavedWarning(false); onClose() }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => setShowUnsavedWarning(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

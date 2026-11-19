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

export default function EditRulesModal({
  initialRules,
  onSave,
  onClose,
  onRuleEvent,
}: EditRulesModalProps) {
  const [rules, setRules] = useState<AlertRule[]>(initialRules)
  const [error, setError] = useState<string | null>(null)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)

  function handleSave() {
    if (rules.length === 0) { setError('Add at least one rule'); return }
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
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
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

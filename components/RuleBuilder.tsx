'use client'

import { useState, useEffect } from 'react'
import { AlertRule, AlertRuleType } from '@/types'
import { formatRuleSummary } from '@/lib/format'
import { HORIZON_URLS } from '@/lib/stellar'
import AlertRuleBadge from './AlertRuleBadge'
import {
  getRuleTemplates,
  saveRuleTemplate,
  deleteRuleTemplate,
  onRuleTemplatesChange,
} from '@/lib/storage'

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

const TEMPLATE_STORAGE_KEY = 'txwatch_rule_templates'

interface RuleTemplate {
  id: string
  name: string
  rules: AlertRule[]
  created_at: number
}

function loadTemplates(): RuleTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(TEMPLATE_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveTemplates(templates: RuleTemplate[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
}

interface RuleBuilderProps {
  rules: AlertRule[]
  onChange: (rules: AlertRule[]) => void
  /** Optional callback fired whenever a rule is added, updated, or removed.
   *  Intended as an analytics hook point — no behavior depends on it. */
  onRulesChanged?: (rules: AlertRule[], action: 'add' | 'update' | 'remove') => void
  /** Exported function names parsed from the contract spec. When null/empty,
   *  function name inputs fall back to plain free text. */
  exportedFunctions?: string[] | null
}

const emptyRule = (): AlertRule => ({ type: 'AnyTransaction' })
const newTemplateId = () => `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const SAC_CONTRACT_ID_REGEX = /^C[A-Z2-7]{55}$/

/** Fetches the number of decimals for a token contract via its `decimals()` function.
 *  Returns null when the value cannot be determined. */
async function fetchTokenDecimals(asset: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/token-decimals?asset=${encodeURIComponent(asset)}`)
    if (!res.ok) return null
    const data = await res.json()
    const decimals = Number(data?.decimals)
    return Number.isInteger(decimals) && decimals >= 0 ? decimals : null
  } catch {
    return null
  }
}

export default function RuleBuilder({ rules, onChange, onRulesChanged }: RuleBuilderProps) {
  const [draft, setDraft] = useState<AlertRule>(emptyRule())
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [templates, setTemplates] = useState<RuleTemplate[]>([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    setTemplates(loadTemplates())
  }, [])

  const specFunctions = exportedFunctions ?? []
  const hasSpec = specFunctions.length > 0
  const specFunctionSet = new Set(specFunctions)
  const datalistId = 'rule-builder-function-names'

  function unknownFunctionNames(): string[] {
    if (!hasSpec) return []
    if (draft.type === 'FunctionCalled') {
      const name = draft.function_name?.trim()
      return name && !specFunctionSet.has(name) ? [name] : []
    }
    if (draft.type === 'AdminFunctionCalled') {
      return (draft.function_names ?? []).filter((name) => name && !specFunctionSet.has(name))
    }
    return []
  }

  const unknownNames = unknownFunctionNames()
  const specWarning =
    unknownNames.length > 0
      ? `Function not found in contract spec — rule may never fire: ${unknownNames.join(', ')}`
      : null

  // Dry-run state
  const [dryRunStatus, setDryRunStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null)
  const [dryRunError, setDryRunError] = useState<string | null>(null)

  function updateDraft(patch: Partial<AlertRule>) {
    setDraft((prev) => ({ ...prev, ...patch }))
    setError(null)
    setWarning(null)
    // Reset dry-run results when rule changes
    setDryRunResult(null)
    setDryRunStatus('idle')
  }

  function handleTypeChange(type: AlertRuleType) {
    setDraft((prev) => ({ type, name: prev.name }))
    setError(null)
    setWarning(null)
    setTokenDecimals(null)
    setDecimalsError(null)
    setDecimalsLoading(false)
  }

  async function handleAssetChange(asset: string) {
    const trimmed = asset.trim()
    updateDraft({ asset: trimmed || undefined })
    setTokenDecimals(null)
    setDecimalsError(null)
    if (!trimmed) {
      setDecimalsLoading(false)
      return
    }
    if (!SAC_CONTRACT_ID_REGEX.test(trimmed)) {
      setDecimalsError('Enter a valid token contract ID (starts with C, 56 characters)')
      setDecimalsLoading(false)
      return
    }
    setDecimalsLoading(true)
    const decimals = await fetchTokenDecimals(trimmed)
    // Ignore stale responses if the asset changed while fetching.
    setDraft((prev) => {
      if (prev.asset !== trimmed) return prev
      setDecimalsLoading(false)
      if (decimals === null) {
        setDecimalsError('Could not fetch token decimals for this contract')
        setTokenDecimals(null)
      } else {
        setDecimalsError(null)
        setTokenDecimals(decimals)
      }
      return prev
    })
  }

  function isDuplicateLabel(newRule: AlertRule): boolean {
    return rules.some((rule) => {
      if (newRule.type !== rule.type) return false
      if (newRule.type === 'LargeTransfer') {
        return (
          (newRule.asset ?? null) === (rule.asset ?? null) &&
          (newRule.asset ? newRule.threshold : newRule.threshold_xlm) ===
            (rule.asset ? rule.threshold : rule.threshold_xlm)
        )
      }
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
    if (draft.name && draft.name.length > 60) {
      setError('Rule name must be 60 characters or fewer')
      return
    }
    if (draft.type === 'LargeTransfer') {
      if (draft.asset) {
        if (!SAC_CONTRACT_ID_REGEX.test(draft.asset)) {
          setError('Enter a valid token contract ID (starts with C, 56 characters)')
          return
        }
        if (decimalsError) {
          setError(decimalsError)
          return
        }
        if (draft.threshold === undefined || draft.threshold === null || isNaN(draft.threshold)) {
          setError('Enter a valid token threshold')
          return
        }
        if (draft.threshold <= 0) {
          setError('Threshold must be greater than 0')
          return
        }
      } else {
        if (draft.threshold_xlm === undefined || draft.threshold_xlm === null || isNaN(draft.threshold_xlm)) {
          setError('Enter a valid XLM threshold')
          return
        }
        if (draft.threshold_xlm <= 0) {
          setError('Threshold must be greater than 0')
          return
        }
      }
    }
    if (draft.type === 'FunctionCalled') {
      if (!draft.function_name?.trim()) {
        setError('Enter a function name')
        return false
      }
      if (!isValidFunctionName(draft.function_name.trim())) {
        setError('Function name must start with a letter or underscore, contain only alphanumeric characters and underscores')
        return false
      }
    }
    if (draft.type === 'AdminFunctionCalled') {
      if (!draft.function_names?.length) {
        setError('Enter at least one function name')
        return false
      }
    }
    return true
  }

  function addRule() {
    if (!validateDraft()) return
    if (draft.type === 'AdminFunctionCalled') {
      draft.function_names = [...(draft.function_names ?? [])].sort()
    }
    const newRule = { ...draft }
    if (editingIndex !== null) {
      const updated = [...rules]
      updated[editingIndex] = newRule
      onChange(updated)
      onRulesChanged?.(updated, 'update')
      setEditingIndex(null)
    } else {
      if (isDuplicateLabel(newRule)) {
        setWarning('This rule already exists')
        return
      }
      const updated = [...rules, newRule]
      onChange(updated)
      onRulesChanged?.(updated, 'add')
    }
    setDraft(emptyRule())
    setError(null)
    setWarning(null)
    setDryRunResult(null)
    setDryRunStatus('idle')
  }

  function startEdit(index: number) {
    const rule = rules[index]
    setDraft(rule)
    setEditingIndex(index)
    setError(null)
    setWarning(null)
    setTokenDecimals(null)
    setDecimalsError(null)
    setDecimalsLoading(false)
    if (rule.type === 'LargeTransfer' && rule.asset) {
      setDecimalsLoading(true)
      fetchTokenDecimals(rule.asset).then((decimals) => {
        setDraft((prev) => {
          if (prev.asset !== rule.asset) return prev
          setDecimalsLoading(false)
          if (decimals === null) {
            setDecimalsError('Could not fetch token decimals for this contract')
            setTokenDecimals(null)
          } else {
            setDecimalsError(null)
            setTokenDecimals(decimals)
          }
          return prev
        })
      })
    }
  }

  function cancelEdit() {
    setDraft(emptyRule())
    setEditingIndex(null)
    setError(null)
    setWarning(null)
    setTokenDecimals(null)
    setDecimalsError(null)
    setDecimalsLoading(false)
  }

  function removeRule(index: number) {
    const updated = rules.filter((_, i) => i !== index)
    onChange(updated)
    onRulesChanged?.(updated, 'remove')
  }

  function saveAsTemplate() {
    if (!templateName.trim()) {
      setError('Enter a template name')
      return
    }
    if (rules.length === 0) {
      setError('No rules to save as template')
      return
    }
    const templates = loadTemplates()
    const newTemplate: RuleTemplate = {
      id: `template_${Date.now()}`,
      name: templateName.trim(),
      rules: [...rules],
      created_at: Date.now(),
    }
    saveTemplates([...templates, newTemplate])
    setTemplates([...templates, newTemplate])
    setTemplateName('')
    setShowTemplateModal(false)
  }

  function loadTemplate(templateId: string) {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      onChange([...template.rules])
      onRulesChanged?.([...template.rules], 'add')
      setSelectedTemplateId(null)
    }
  }

  function deleteTemplate(templateId: string) {
    const templates = loadTemplates().filter(t => t.id !== templateId)
    saveTemplates(templates)
    setTemplates(templates)
  }

  function openSaveTemplateModal() {
    if (rules.length === 0) {
      setError('No rules to save as template')
      return
    }
    setShowTemplateModal(true)
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
          <p className="text-xs text-zinc-500 mt-1">
            {RULE_EXAMPLES[draft.type]}{' '}
            <a
              href={`${ALERT_RULES_DOC_URL}#${draft.type.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Learn more
            </a>
          </p>
        </div>

        {draft.type === 'LargeTransfer' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Asset <span className="text-zinc-600">(optional — SAC/token contract ID)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. C... (leave empty for XLM)"
                value={draft.asset ?? ''}
                onChange={(e) => handleAssetChange(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
              {decimalsLoading && <p className="text-xs text-zinc-500 mt-1">Fetching token decimals…</p>}
              {!decimalsLoading && decimalsError && <p className="text-xs text-red-400 mt-1">{decimalsError}</p>}
              {!decimalsLoading && !decimalsError && tokenDecimals !== null && (
                <p className="text-xs text-zinc-500 mt-1">Token decimals: {tokenDecimals}</p>
              )}
            </div>
            {draft.asset ? (
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Threshold (token units)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 1000"
                  value={draft.threshold ?? ''}
                  onChange={(e) => updateDraft({ threshold: parseFloat(e.target.value) || undefined })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : (
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
          </div>
        )}

        {hasSpec && (
          <datalist id={datalistId}>
            {specFunctions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        )}

        {draft.type === 'FunctionCalled' && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Function Name</label>
            <input
              type="text"
              list={hasSpec ? datalistId : undefined}
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
              list={hasSpec ? datalistId : undefined}
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

        {/* Optional rule name — shown in rule list, Active Rules, and WebhookLog */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1">
            Rule Name <span className="text-zinc-600">(optional, max 60 chars)</span>
          </label>
          <input
            type="text"
            placeholder='e.g. "Treasury withdraw"'
            maxLength={60}
            value={draft.name ?? ''}
            onChange={(e) => updateDraft({ name: e.target.value || undefined })}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
          />
          {draft.name !== undefined && (
            <p className="text-xs text-zinc-600 mt-0.5 text-right">{draft.name.length}/60</p>
          )}
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {warning && <p className="text-xs text-amber-400">{warning}</p>}
        {specWarning && <p className="text-xs text-amber-400">{specWarning}</p>}

        <div className="flex flex-wrap gap-2">
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

          {isDraftTestable() && (
            <button
              type="button"
              onClick={handleTestRule}
              disabled={dryRunStatus === 'running'}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-sm font-medium text-zinc-200 transition-colors"
              title={!contractId ? 'Enter a contract ID to enable dry-run testing' : 'Evaluate this rule against the last 20 transactions'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {dryRunStatus === 'running' ? 'Testing…' : 'Test Rule'}
            </button>
          )}

          {editingIndex !== null && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-medium text-white transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={openSaveTemplateModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Save as Template
          </button>
        </div>

        {/* Dry-run results */}
        {dryRunStatus === 'done' && dryRunResult && (
          <div className="mt-3 rounded-lg bg-zinc-900 border border-zinc-700 p-3 space-y-2">
            <p className="text-xs font-semibold text-zinc-300">
              Dry-run results:{' '}
              <span className={dryRunResult.matched > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {dryRunResult.matched} of {dryRunResult.total} recent transactions
              </span>{' '}
              would have matched
            </p>
            {dryRunResult.matchedHashes.length > 0 && (
              <ul className="space-y-1 max-h-36 overflow-y-auto">
                {dryRunResult.matchedHashes.map((hash) => (
                  <li key={hash} className="text-xs font-mono text-zinc-400 truncate">
                    {hash.slice(0, 16)}…{hash.slice(-8)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {dryRunStatus === 'error' && dryRunError && (
          <p className="text-xs text-red-400 mt-2">Dry-run failed: {dryRunError}</p>
        )}
      </div>

      {rules.length > 0 && (
        <ul className="space-y-2">
          {rules.map((rule, i) => (
            <li key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${editingIndex === i ? 'bg-indigo-900/30 border-indigo-600' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <AlertRuleBadge type={rule.type} />
                {rule.name && (
                  <span className="text-xs font-medium text-zinc-200">{rule.name}</span>
                )}
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

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100">Save Rule Template</h3>
            <p className="text-sm text-zinc-400">
              Save the current {rules.length} rule{rules.length !== 1 ? 's' : ''} as a reusable template.
            </p>
            <div className="space-y-4">
              <div>
                <label htmlFor="template-name" className="block text-sm font-medium text-zinc-300 mb-2">
                  Template Name
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. High Value Transfers, Admin Functions"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={saveAsTemplate}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
              >
                Save Template
              </button>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Template Modal */}
      {templates.length > 0 && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-zinc-300">Rule Templates ({templates.length})</h4>
            <button
              onClick={() => setSelectedTemplateId(templates[0]?.id || null)}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              View All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates.slice(0, 3).map((template) => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
              >
                <span className="font-medium text-zinc-100">{template.name}</span>
                <span className="text-xs text-zinc-500">{template.rules.length} rule{template.rules.length !== 1 ? 's' : ''}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTemplate(template.id) }}
                  className="text-zinc-600 hover:text-red-400 ml-1"
                  aria-label="Delete template"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

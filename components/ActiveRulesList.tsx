'use client'

import { useState } from 'react'
import { AlertRule } from '@/types'
import { formatRuleSummary, exportRulesToToml } from '@/lib/format'
import AlertRuleBadge from '@/components/AlertRuleBadge'

interface ActiveRulesListProps {
  rules: AlertRule[]
}

export default function ActiveRulesList({ rules }: ActiveRulesListProps) {
  const [showToml, setShowToml] = useState(false)
  const [copied, setCopied] = useState(false)

  const toml = exportRulesToToml(rules)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(toml)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard API unavailable — fall back silently
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-zinc-100">Active Rules</h2>
        {rules.length > 0 && (
          <button
            type="button"
            onClick={() => setShowToml((v) => !v)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-zinc-400 bg-zinc-800 border border-zinc-700 hover:text-zinc-200 hover:border-zinc-600 transition-colors"
            aria-expanded={showToml}
            title="Export rules as TOML snippet"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {showToml ? 'Hide TOML' : 'Export TOML'}
          </button>
        )}
      </div>

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

      {showToml && rules.length > 0 && (
        <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800/50">
            <span className="text-xs font-medium text-zinc-400">TOML snippet</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="p-3 text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre">{toml}</pre>
        </div>
      )}
    </div>
  )
}

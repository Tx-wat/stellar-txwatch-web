'use client'

import { useState } from 'react'
import { AlertRule, WatchedContract } from '@/types'
import { getContracts, saveContract } from '@/lib/storage'

interface CopyRulesModalProps {
  sourceContractId: string
  rules: AlertRule[]
  onClose: () => void
}

/** Pick another contract and merge these rules into it, skipping exact duplicates (#650). */
export default function CopyRulesModal({ sourceContractId, rules, onClose }: CopyRulesModalProps) {
  // Targets are read once on open; the list does not refresh while the modal is up.
  const [targets] = useState<WatchedContract[]>(() =>
    getContracts().filter((contract) => contract.id !== sourceContractId)
  )
  const [message, setMessage] = useState<string | null>(null)

  function copyTo(target: WatchedContract) {
    const existing = new Set(target.rules.map((rule) => JSON.stringify(rule)))
    const additions = rules.filter((rule) => !existing.has(JSON.stringify(rule)))
    if (additions.length > 0) {
      saveContract({ ...target, rules: [...target.rules, ...additions] })
    }
    const skipped = rules.length - additions.length
    setMessage(
      `Copied ${additions.length} ${additions.length === 1 ? 'rule' : 'rules'} to ${target.label}` +
        (skipped > 0 ? `, ${skipped} already present` : '') +
        '.'
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div role="dialog" aria-modal="true" aria-label="Copy rules" className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100">Copy Rules</h3>
        <p className="text-sm text-zinc-400">
          Copy {rules.length} {rules.length === 1 ? 'rule' : 'rules'} to another contract:
        </p>

        {targets.length === 0 ? (
          <p className="text-sm text-zinc-500">No other contracts to copy to.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {targets.map((target) => (
              <li key={target.id}>
                <button
                  type="button"
                  onClick={() => copyTo(target)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-200 transition-colors"
                >
                  {target.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}

        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WatchedContract, AlertPayload, AlertRule } from '@/types'
import { getContract, deleteContract, getAlerts, saveContract } from '@/lib/storage'
import { truncateId, explorerContractUrl } from '@/lib/stellar'
import { formatDate } from '@/lib/format'
import NetworkBadge from '@/components/NetworkBadge'
import AlertRuleBadge from '@/components/AlertRuleBadge'
import WebhookLog from '@/components/WebhookLog'
import RuleBuilder from '@/components/RuleBuilder'
import CopyButton from '@/components/CopyButton'

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [contract, setContract] = useState<WatchedContract | null>(null)
  const [alerts, setAlerts] = useState<AlertPayload[]>([])
  const [mounted, setMounted] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showEditRules, setShowEditRules] = useState(false)
  const [editedRules, setEditedRules] = useState<AlertRule[]>([])
  const [rulesError, setRulesError] = useState<string | null>(null)

  useEffect(() => {
    const c = getContract(params.id)
    if (!c) { router.replace('/contracts'); return }
    setContract(c)
    setAlerts(getAlerts(params.id))
    setMounted(true)
  }, [params.id, router])

  function handleDelete() {
    deleteContract(params.id)
    router.push('/contracts')
  }

  function openEditRules() {
    setEditedRules(contract!.rules)
    setRulesError(null)
    setShowEditRules(true)
  }

  function saveRules() {
    if (editedRules.length === 0) { setRulesError('Add at least one rule'); return }
    const updated = { ...contract!, rules: editedRules }
    saveContract(updated)
    setContract(updated)
    setShowEditRules(false)
  }

  if (!mounted || !contract) return null

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-100">{contract.label}</h1>
            <NetworkBadge network={contract.network} />
          </div>
          <a
            href={explorerContractUrl(contract.network, contract.contract_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors break-all"
          >
            {truncateId(contract.contract_id, 12)}
          </a>
          <CopyButton text={contract.contract_id} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openEditRules}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Edit Rules
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="px-3 py-1.5 rounded-lg border border-red-800 hover:border-red-600 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Webhook URL</p>
          <a
            href={contract.webhook_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors break-all"
          >
            {contract.webhook_url}
          </a>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Registered</p>
          <p className="text-sm text-zinc-300">{formatDate(contract.created_at)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Alerts</p>
          <p className="text-sm text-zinc-300">{alerts.length}</p>
        </div>
      </div>

      {/* Active Rules */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Active Rules</h2>
        {contract.rules.length === 0 ? (
          <p className="text-sm text-zinc-500">No rules configured.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {contract.rules.map((rule, i) => (
              <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
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
            ))}
          </div>
        )}
      </div>

      {/* Alert History */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Alert History</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <WebhookLog alerts={alerts} network={contract.network} />
        </div>
      </div>

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100">Delete Contract?</h3>
            <p className="text-sm text-zinc-400">
              This will permanently remove <span className="text-zinc-200 font-medium">{contract.label}</span> and all its alert history. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rules Modal */}
      {showEditRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-zinc-100">Edit Alert Rules</h3>
            <RuleBuilder rules={editedRules} onChange={setEditedRules} />
            {rulesError && <p className="text-xs text-red-400">{rulesError}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={saveRules}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
              >
                Save Rules
              </button>
              <button
                onClick={() => setShowEditRules(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

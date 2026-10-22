'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { WatchedContract, AlertPayload, AlertRule } from '@/types'
import { getContract, deleteContract, getAlerts, saveContract } from '@/lib/storage'
import { useAnalytics } from '@/lib/useAnalytics'
import WebhookLog from '@/components/WebhookLog'
import ContractHeader from '@/components/ContractHeader'
import ContractMetadataCards from '@/components/ContractMetadataCards'
import ActiveRulesList from '@/components/ActiveRulesList'
import EditDetailsModal from '@/components/EditDetailsModal'
import EditRulesModal from '@/components/EditRulesModal'
import DeleteContractModal from '@/components/DeleteContractModal'
import ContractDetailLoading from './loading'


export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { trackEvent } = useAnalytics()

  const [contract, setContract] = useState<WatchedContract | null>(null)
  const [alerts, setAlerts] = useState<AlertPayload[]>([])
  const [contractNotFound, setContractNotFound] = useState(false)

  const [showDelete, setShowDelete] = useState(false)
  const [showEditDetails, setShowEditDetails] = useState(false)
  const [showEditRules, setShowEditRules] = useState(false)
  const [editedRules, setEditedRules] = useState<AlertRule[]>([])
  const [rulesError, setRulesError] = useState<string | null>(null)
const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [searchHash, setSearchHash] = useState('')
   
  // Metadata editing state
  const [showEditMetadata, setShowEditMetadata] = useState(false)
  const [editedLabel, setEditedLabel] = useState('')
  const [editedWebhookUrl, setEditedWebhookUrl] = useState('')
  const [editedWebhookSecret, setEditedWebhookSecret] = useState('')
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [metadataError, setMetadataError] = useState<string | null>(null)
  const [relativeCreatedAt, setRelativeCreatedAt] = useState<string>('')

  useEffect(() => {
    if (!contract?.created_at) return
    const update = () => setRelativeCreatedAt(formatRelativeTime(contract.created_at))
    update()
    const interval = setInterval(update, 30000)
    return () => clearInterval(interval)
  }, [contract?.created_at])


  // Explorer preference
  const [explorer, setExplorer] = useState<ExplorerId>('stellar-expert')

  // Contract instance TTL state
  const [liveUntilLedgerSeq, setLiveUntilLedgerSeq] = useState<number | null>(null)
  const [expiryDate, setExpiryDate] = useState<Date | null>(null)
  const [ttlLoading, setTtlLoading] = useState(false)
  const [ttlError, setTtlError] = useState<string | null>(null)

  // On-chain metadata state
  const [chainMetadata, setChainMetadata] = useState<ContractMetadata | null>(null)
  const [chainMetadataLoading, setChainMetadataLoading] = useState(true)
  const [chainMetadataError, setChainMetadataError] = useState(false)

  // Recent events state
  const [events, setEvents] = useState<ContractEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState(false)

  useEffect(() => {
    if (!undoToast) return
    const timer = setTimeout(() => setUndoToast(null), 8000)
    return () => clearTimeout(timer)
  }, [undoToast])

  // Test webhook state (#424)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [testStatusCode, setTestStatusCode] = useState<number | null>(null)
  const [testLatency, setTestLatency] = useState<number | null>(null)
  const testAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const c = getContract(params.id)
    if (!c) { setContractNotFound(true); return }
    setContract(c)
    setAlerts(getAlerts(params.id))
  }, [params.id])

  const filteredAlerts = useMemo(() => {
    if (!searchHash) return alerts
    const searchLower = searchHash.toLowerCase()
    return alerts.filter(a => a.transaction_hash.toLowerCase().includes(searchLower))
  }, [alerts, searchHash])

  useEffect(() => {
    if (!contract) return
    let cancelled = false
    setTtlLoading(true)
    setTtlError(null)
    fetchContractInstance(contract.network, contract.contract_id)
      .then((instance) => {
        if (cancelled) return
        if (!instance) {
          setTtlError('Unable to load instance TTL')
          return
        }
        setLiveUntilLedgerSeq(instance.liveUntilLedgerSeq)
        setExpiryDate(estimateExpiryDate(instance.liveUntilLedgerSeq))
      })
      .catch(() => {
        if (!cancelled) setTtlError('Unable to load instance TTL')
      })
      .finally(() => {
        if (!cancelled) setTtlLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [contract])

  const daysToExpiry = expiryDate
    ? Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const expirySeverity: 'red' | 'amber' | null =
    daysToExpiry === null ? null : daysToExpiry < 7 ? 'red' : daysToExpiry < 30 ? 'amber' : null

  useEffect(() => {
    if (!contract) return
    let cancelled = false
    setChainMetadataLoading(true)
    setChainMetadataError(false)
    fetchContractMetadata(contract.network, contract.contract_id)
      .then((meta) => {
        if (cancelled) return
        setChainMetadata(meta)
        setChainMetadataLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setChainMetadataError(true)
        setChainMetadataLoading(false)
      })
    return () => { cancelled = true }
  }, [contract?.network, contract?.contract_id])

  useEffect(() => {
    if (!contract) return
    let cancelled = false
    setEventsLoading(true)
    setEventsError(false)
    fetchContractEvents(contract.network, contract.contract_id)
      .then((evts) => {
        if (cancelled) return
        setEvents(evts)
        setEventsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setEventsError(true)
        setEventsLoading(false)
      })
    return () => { cancelled = true }
  }, [contract?.network, contract?.contract_id])

  function refreshEvents() {
    if (!contract) return
    setEventsLoading(true)
    setEventsError(false)
    fetchContractEvents(contract.network, contract.contract_id)
      .then((evts) => {
        setEvents(evts)
        setEventsLoading(false)
      })
      .catch(() => {
        setEventsError(true)
        setEventsLoading(false)
      })
  }

  // Clean up test controller on unmount
  useEffect(() => {
    return () => { testAbortRef.current?.abort() }
  }, [])

  // Update title when contract label changes (e.g. after metadata edit)
  useEffect(() => {
    if (contract) {
      document.title = `${contract.label} · TxWatch`
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.label])

  async function handleTestWebhook() {
    if (!contract) return
    testAbortRef.current?.abort()
    const controller = new AbortController()
    testAbortRef.current = controller
    setTestStatus('sending')
    setTestError(null)
    setTestStatusCode(null)
    setTestLatency(null)
    const start = performance.now()
    try {
      const { status, ok } = await sendTestWebhook(
        contract.webhook_url,
        contract.contract_id,
        contract.network,
        controller.signal
      )
      const elapsed = Math.round(performance.now() - start)
      setTestLatency(elapsed)
      setTestStatusCode(status)
      if (ok) {
        setTestStatus('ok')
        addToast('Test webhook delivered successfully', 'success')
      } else {
        setTestStatus('error')
        setTestError(`Server responded with ${status}`)
        addToast(`Test webhook failed: ${status}`, 'error')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const elapsed = Math.round(performance.now() - start)
      setTestLatency(elapsed)
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Request failed')
      addToast(`Test webhook failed: ${err instanceof Error ? err.message : 'Request failed'}`, 'error')
    }
  }

  function handleDelete() {
    const deletedContract = contract!
    const deletedAlerts = alerts
    deleteContract(params.id)
    setShowDelete(false)
    setUndoToast({ contract: deletedContract, alerts: deletedAlerts })
    router.push('/contracts')
  }

  function handleSaveDetails(updated: WatchedContract) {
    saveContract(updated)
    setShowEditRules(false)
    trackEvent('rule_edit_saved', { contractId: params.id, ruleCount: editedRules.length })
  }

  function hasUnsavedChanges(): boolean {
    return JSON.stringify(editedRules) !== JSON.stringify(contract?.rules ?? [])
  }

  function handleCancelEdit() {
    if (hasUnsavedChanges()) {
      setShowUnsavedWarning(true)
    } else {
      setShowEditRules(false)
    }
  }

  function confirmDiscard() {
    setShowUnsavedWarning(false)
    setShowEditRules(false)
  }

  // Metadata editing functions
  function openEditMetadata() {
    setEditedLabel(contract!.label)
    setEditedWebhookUrl(contract!.webhook_url)
    setEditedWebhookSecret(contract!.webhook_secret || '')
    setShowWebhookSecret(false)
    setMetadataError(null)
    setShowEditMetadata(true)
    trackEvent('metadata_edit_opened', { contractId: params.id })
  }

  function saveMetadata() {
    const trimmedLabel = editedLabel.trim()
    const trimmedWebhookUrl = editedWebhookUrl.trim()
    const trimmedFallbackUrl = editedFallbackWebhookUrl.trim()

    if (!trimmedLabel) {
      setMetadataError('Label is required')
      return
    }
    if (trimmedLabel.length > 100) {
      setMetadataError('Label must be 100 characters or less')
      return
    }
    if (!trimmedWebhookUrl) {
      setMetadataError('Webhook URL is required')
      return
    }
    if (!isValidUrl(trimmedWebhookUrl)) {
      setMetadataError('Please enter a valid HTTP or HTTPS URL')
      return
    }
    if (trimmedFallbackUrl && !isValidUrl(trimmedFallbackUrl)) {
      setMetadataError('Fallback webhook must be a valid HTTP or HTTPS URL')
      return
    }

    if (editedNotes.length > 1000) {
      setMetadataError('Notes must be 1000 characters or less')
      return
    }

    // Save changes
    const updated = { 
      ...contract!, 
      label: trimmedLabel,
      webhook_url: trimmedWebhookUrl,
      webhook_secret: editedWebhookSecret.trim() || undefined,
    }
    saveContract(updated)
    setShowEditMetadata(false)
    trackEvent('metadata_edit_saved', { contractId: params.id })
  }

  function hasMetadataChanges(): boolean {
    return editedLabel !== contract?.label || editedWebhookUrl !== contract?.webhook_url || editedWebhookSecret !== (contract?.webhook_secret || '')
  }

  function handleCancelMetadataEdit() {
    if (hasMetadataChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        setShowEditMetadata(false)
      }
    } else {
      setShowEditMetadata(false)
    }
  }

  if (contractNotFound) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="flex justify-center">
            <svg className="w-16 h-16 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100">Contract Not Found</h2>
          <p className="text-sm text-zinc-400">
            The contract you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
          <button
            onClick={() => router.push('/contracts')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Contracts
          </button>
        </div>
      </div>
    )
  }

  if (!contract) return <ContractDetailLoading />

  const isPaused = contract.enabled === false

  const isMainnet = contract.network === 'mainnet'
  const canDelete = !isMainnet || deleteConfirmText === contract.label

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Undo Delete Toast */}
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 shadow-lg">
          <p className="text-sm text-zinc-300">
            Deleted <span className="text-zinc-100 font-medium">{undoToast.contract.label}</span>
          </p>
          <button
            onClick={handleUndoDelete}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
          >
            Undo
          </button>
          <button
            onClick={() => setUndoToast(null)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-100">{contract.label}</h1>
            <NetworkBadge network={contract.network} />
            {isPaused && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-700 text-xs font-medium text-amber-400">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={explorerContractUrl(contract.network, contract.contract_id, explorer)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-indigo-400 hover:text-indigo-300 transition-colors break-all"
            >
              {truncateId(contract.contract_id, 12)}
            </a>
            <CopyButton text={contract.contract_id} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={handleToggleEnabled}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleDuplicate}
            className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Duplicate
          </button>
          <button
            onClick={openEditMetadata}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Edit Details
          </button>
          <button
            onClick={openEditRules}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Edit Rules
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border border-red-800 hover:border-red-600 text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-zinc-500">Webhook URL</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testStatus === 'sending'}
                className="px-2 py-0.5 rounded-md border border-zinc-700 hover:border-zinc-500 text-xs text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Send a test payload to this webhook endpoint"
              >
                {testStatus === 'sending' ? 'Sending…' : testStatus === 'ok' ? `${testStatusCode} OK` : testStatus === 'error' ? `${testStatusCode ?? 'ERR'} Failed` : 'Send test'}
              </button>
              <CopyButton text={contract.webhook_url} />
            </div>
          </div>
          <a
            href={contract.webhook_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors break-all"
          >
            {contract.webhook_url}
          </a>
          {testStatus === 'error' && testError && (
            <p className="mt-1 text-xs text-red-400">{testError}</p>
          )}
          {testStatus === 'ok' && (
            <p className="mt-1 text-xs text-emerald-400">
              Test payload delivered — {testStatusCode} received{testLatency !== null ? ` · ${testLatency}ms` : ''}
            </p>
          )}
        </div>
        {contract.webhook_secret && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-zinc-500">Webhook Secret</p>
              <CopyButton text={contract.webhook_secret} />
            </div>
            <p className="text-sm text-zinc-300 font-mono">••••••••{contract.webhook_secret.slice(-4)}</p>
          </div>
        )}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">Registered</p>
          <p
            className="text-sm text-zinc-300 cursor-help"
            title={`${formatDate(contract.created_at)} ${new Date(contract.created_at).toLocaleTimeString()}`}
          >
            {relativeCreatedAt || formatRelativeTime(contract.created_at)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{formatDate(contract.created_at)}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 mb-1">{alerts.length === 0 ? 'Total Alerts' : 'Last Alert'}</p>
          {alerts.length === 0 ? (
            <p className="text-sm text-zinc-300">No alerts yet</p>
          ) : (
            <>
              <p className="text-sm text-zinc-300" title={isoString(alerts[0].timestamp)}>{tzFormatDate(alerts[0].timestamp)}</p>
              <p className="text-xs text-zinc-500 mt-1" title={isoString(alerts[0].timestamp)}>
                {mode === 'utc'
                  ? new Date(alerts[0].timestamp).toLocaleTimeString('en-US', { timeZone: 'UTC' }) + ' UTC'
                  : new Date(alerts[0].timestamp).toLocaleTimeString()}
              </p>
            </>
          )}
        </div>
        {!chainMetadataError && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">WASM Hash</p>
            {chainMetadataLoading ? (
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
            ) : chainMetadata?.isSac ? (
              <p className="text-sm text-zinc-300">Stellar Asset Contract</p>
            ) : chainMetadata?.wasmHash ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-zinc-300 break-all">
                  {truncateId(chainMetadata.wasmHash, 8)}
                </span>
                <CopyButton text={chainMetadata.wasmHash} />
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Unavailable</p>
            )}
          </div>
        )}
        {!chainMetadataError && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">Last Modified Ledger</p>
            {chainMetadataLoading ? (
              <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
            ) : chainMetadata?.lastModifiedLedger != null ? (
              <p className="text-sm text-zinc-300 font-mono">
                {chainMetadata.lastModifiedLedger.toLocaleString()}
              </p>
            ) : (
              <p className="text-sm text-zinc-500">Unavailable</p>
            )}
          </div>
        )}
      </div>

      {/* Instance TTL / Expiry */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Instance Expiry</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
          {ttlLoading ? (
            <p className="text-sm text-zinc-500">Loading instance TTL…</p>
          ) : ttlError ? (
            <p className="text-sm text-zinc-500">{ttlError}</p>
          ) : liveUntilLedgerSeq === null ? (
            <p className="text-sm text-zinc-500">No TTL information available.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                <div>
                  <p className="text-xs text-zinc-500">Live Until Ledger</p>
                  <p className="text-sm font-mono text-zinc-300">{liveUntilLedgerSeq.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Estimated Expiry</p>
                  <p className="text-sm text-zinc-300">
                    {expiryDate ? expiryDate.toLocaleString() : 'Unknown'}
                  </p>
                </div>
                {daysToExpiry !== null && (
                  <div>
                    <p className="text-xs text-zinc-500">Time Remaining</p>
                    <p className="text-sm text-zinc-300">
                      {daysToExpiry <= 0 ? 'Expired or expiring today' : `${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}`}
                    </p>
                  </div>
                )}
              </div>
              {expirySeverity && (
                <div
                  className={
                    expirySeverity === 'red'
                      ? 'bg-red-900/20 border border-red-800 rounded-lg p-3'
                      : 'bg-amber-900/20 border border-amber-800 rounded-lg p-3'
                  }
                >
                  <p className={expirySeverity === 'red' ? 'text-xs text-red-400' : 'text-xs text-amber-400'}>
                    {expirySeverity === 'red'
                      ? 'This contract instance expires in under 7 days. Extend its TTL to avoid archival.'
                      : 'This contract instance expires in under 30 days. Consider extending its TTL.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Timezone toggle (#425) */}
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span>Timezone:</span>
        <button
          type="button"
          onClick={toggleMode}
          className="px-2 py-1 rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-zinc-100 transition-colors"
          title="Toggle between local and UTC time display"
        >
          {mode === 'utc' ? 'UTC' : 'Local'}
        </button>
        <span className="text-zinc-600">·</span>
        <span>Hover any timestamp to see full ISO-8601</span>
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

      {/* Activity Heatmap */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-100 mb-3">Alert Activity</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <AlertHeatmap alerts={alerts} contractId={contract.contract_id} />
        </div>
      </div>

      {/* Alert History */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="text-lg font-semibold text-zinc-100">Alert History</h2>
          <div className="relative w-full sm:w-64">
            <label htmlFor="hash-search" className="sr-only">Search by transaction hash</label>
            <input
              id="hash-search"
              type="text"
              placeholder="Search by transaction hash..."
              value={searchHash}
              onChange={(e) => setSearchHash(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchHash && (
              <button
                onClick={() => setSearchHash('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <WebhookLog alerts={filteredAlerts} network={contract.network} />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-zinc-100">Recent activity</h2>
          <button
            onClick={refreshEvents}
            disabled={eventsLoading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 ${eventsLoading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {eventsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-10 bg-zinc-800 rounded animate-pulse" />
              ))}
            </div>
          ) : eventsError ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-zinc-400">Failed to load recent events.</p>
              <button
                onClick={refreshEvents}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
              >
                Retry
              </button>
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-zinc-500">No recent events</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {events.slice(0, 20).map((event, i) => (
                <li key={`${event.txHash}-${i}`} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-zinc-200">{event.type}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-zinc-500">
                        Ledger {event.ledger.toLocaleString()}
                      </span>
                      <a
                        href={explorerTxUrl(contract.network, event.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        View tx
                      </a>
                    </div>
                  </div>
                  {event.topics.length > 0 && (
                    <p className="text-xs font-mono text-zinc-400 break-all">
                      {event.topics.map((t) => JSON.stringify(t)).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Edit Metadata Modal */}
      {showEditMetadata && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100">Edit Contract Details</h3>
            
            <div className="space-y-4">
              {/* Label field */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor="edit-label" className="block text-sm font-medium text-zinc-300">
                    Label
                  </label>
                  <span className="text-xs text-zinc-500">{editedLabel.length}/100</span>
                </div>
                <input
                  id="edit-label"
                  type="text"
                  value={editedLabel}
                  onChange={(e) => setEditedLabel(e.target.value)}
                  placeholder="My Contract"
                  maxLength={100}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {editedLabel.length}/100
                </p>
              </div>


              {/* Webhook URL field */}
              <div>
                <label htmlFor="edit-webhook" className="block text-sm font-medium text-zinc-300 mb-2">
                  Webhook URL
                </label>
                <input
                  id="edit-webhook"
                  type="url"
                  value={editedWebhookUrl}
                  onChange={(e) => setEditedWebhookUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Must be a valid HTTP or HTTPS URL
                </p>
              </div>

              {/* Webhook Secret field */}
              <div>
                <label htmlFor="edit-webhook-secret" className="block text-sm font-medium text-zinc-300 mb-2">
                  Webhook Secret (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    id="edit-webhook-secret"
                    type={showWebhookSecret ? 'text' : 'password'}
                    value={editedWebhookSecret}
                    onChange={(e) => setEditedWebhookSecret(e.target.value)}
                    placeholder="Your HMAC secret key"
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                    className="px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors whitespace-nowrap"
                  >
                    {showWebhookSecret ? 'Hide' : 'Show'}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Used to sign payloads with HMAC-SHA256. Receivers can verify the X-TxWatch-Signature header.
                </p>
              </div>
            </div>

            {metadataError && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
                <p className="text-xs text-red-400">{metadataError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={saveMetadata}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelMetadataEdit}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-zinc-100">Delete Contract?</h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <p>
                This will remove <span className="text-zinc-200 font-medium">{contract.label}</span>. You&apos;ll have a few seconds to undo.
              </p>
              <p className="text-xs text-zinc-500">
                Deleted data:
              </p>
              <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1">
                <li>Contract configuration and alert rules</li>
                <li>All {alerts.length} alert {alerts.length === 1 ? 'record' : 'records'}</li>
              </ul>
            </div>
            {isMainnet && (
              <div>
                <label htmlFor="delete-confirm" className="block text-sm font-medium text-zinc-300 mb-2">
                  Type <span className="text-zinc-100 font-mono">{contract.label}</span> to confirm
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={contract.label}
                  autoComplete="off"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={!canDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
              >
                Delete
              </button>
              <button
                onClick={() => { setShowDelete(false); setDeleteConfirmText('') }}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditRules && (
        <EditRulesModal
          initialRules={contract.rules}
          onSave={handleSaveRules}
          onClose={() => setShowEditRules(false)}
          onRuleEvent={(rules, action) =>
            trackEvent(action === 'remove' ? 'rule_removed' : 'rule_added', {
              contractId: params.id,
              ruleCount: rules.length,
            })
          }
        />
      )}

      {showDelete && (
        <DeleteContractModal
          contractLabel={contract.label}
          alertCount={alerts.length}
          onConfirm={handleDelete}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  )
}

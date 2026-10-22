'use client'

import RuleBuilder from '@/components/RuleBuilder'
import FreighterConnect from '@/components/FreighterConnect'
import Toast from '@/components/Toast'

const DRAFT_STORAGE_KEY = 'txwatch_new_contract_draft'

interface ContractDraft {
  label: string
  contractId: string
  network: Network
  webhookUrl: string
  rules: AlertRule[]
}

interface FormErrors {
  label?: string
  contract_id?: string
  webhook_url?: string
  fallback_webhook_url?: string
  rules?: string
  wallet?: string
  network?: string
  signers?: string
}

const STELLAR_PUBLIC_KEY_REGEX = /^G[A-Z2-7]{55}$/

function isValidPublicKey(key: string): boolean {
  return STELLAR_PUBLIC_KEY_REGEX.test(key)
}

export default function NewContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isConnected, publicKey } = useFreighterConnection()
  const { contracts, add: addContract } = useContracts()
  const [networkWarning, setNetworkWarning] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [contractId, setContractId] = useState('')
  const [network, setNetwork] = useState<Network>('testnet')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [rules, setRules] = useState<AlertRule[]>([])
  const [signers, setSigners] = useState<string[]>([])
  const [signerInput, setSignerInput] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [testStatusCode, setTestStatusCode] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [contractCheck, setContractCheck] = useState<'idle' | 'checking' | 'found' | 'not_found' | 'error'>('idle')
  const testAbortRef = useRef<AbortController | null>(null)
  const contractCheckSeqRef = useRef(0)

  useEffect(() => {
    document.title = 'Add Contract · TxWatch'
    return () => { testAbortRef.current?.abort() }
  }, [])

  async function runContractCheck(id: string, net: Network) {
    const trimmed = id.trim()
    if (!trimmed || !isValidContractId(trimmed)) {
      setContractCheck('idle')
      return
    }
    const seq = ++contractCheckSeqRef.current
    setContractCheck('checking')
    try {
      const exists = await checkContractExists(net, trimmed)
      if (seq !== contractCheckSeqRef.current) return
      setContractCheck(exists ? 'found' : 'not_found')
    } catch {
      if (seq !== contractCheckSeqRef.current) return
      setContractCheck('error')
    }
  }

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as Partial<ContractDraft>
        if (typeof draft.label === 'string') setLabel(draft.label)
        if (typeof draft.contractId === 'string') setContractId(draft.contractId)
        if (draft.network === 'testnet' || draft.network === 'mainnet' || draft.network === 'futurenet') {
          setNetwork(draft.network)
        }
        if (typeof draft.webhookUrl === 'string') setWebhookUrl(draft.webhookUrl)
        if (Array.isArray(draft.rules)) setRules(draft.rules)
        setDraftRestored(true)
      }
    } catch {
      // ignore storage/parse errors
    }
    draftLoadedRef.current = true
  }, [])

  // Debounced draft persistence (test results are intentionally excluded)
  useEffect(() => {
    if (!draftLoadedRef.current) return
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => {
      try {
        sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ label, contractId, network, webhookUrl, rules })
        )
      } catch {
        // ignore storage errors
      }
    }, 400)
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [label, contractId, network, webhookUrl, rules])

  function clearDraft() {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // ignore storage errors
    }
  }

  function handleDiscardDraft() {
    clearDraft()
    setLabel('')
    setContractId('')
    setNetwork('testnet')
    setWebhookUrl('')
    setRules([])
    setErrors({})
    setTestStatus('idle')
    setTestError(null)
    setTestStatusCode(null)
    setNetworkWarning(null)
    setDraftRestored(false)
  }

  // Pre-fill the connected wallet as the first signer (only when empty)
  useEffect(() => {
    if (publicKey && signers.length === 0) {
      setSigners([publicKey])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey])

  function handleWalletConnect() {
    setErrors((prev) => ({ ...prev, wallet: undefined }))
  }

  function addSigner() {
    const trimmed = signerInput.trim()
    if (!trimmed) return
    if (!isValidPublicKey(trimmed)) {
      setErrors((prev) => ({ ...prev, signers: 'Must be a valid Stellar public key (starts with G, 56 chars)' }))
      return
    }
    if (signers.includes(trimmed)) {
      setErrors((prev) => ({ ...prev, signers: 'Signer already added' }))
      return
    }
    setSigners([...signers, trimmed])
    setSignerInput('')
    setErrors((prev) => ({ ...prev, signers: undefined }))
  }

  function removeSigner(key: string) {
    setSigners(signers.filter((s) => s !== key))
  }

  function validate(): FormErrors {
    const e: FormErrors = {}
    const trimmedLabel = label.trim()
    const trimmedContractId = contractId.trim()
    const trimmedWebhookUrl = webhookUrl.trim()
    const trimmedFallbackUrl = fallbackWebhookUrl.trim()

    if (!trimmedLabel) e.label = 'Label is required'
    if (!trimmedContractId) e.contract_id = 'Contract ID is required'
    else if (!isValidContractId(trimmedContractId)) e.contract_id = 'Must be a valid Soroban contract address (starts with C, 56 chars)'
    else {
      // Check for duplicate contract_id + network combination
      const isDuplicate = contracts.some(
        (c) => c.contract_id === trimmedContractId && c.network === network
      )
      if (isDuplicate) e.contract_id = `This contract is already registered on ${network}`
    }
    if (!trimmedWebhookUrl) e.webhook_url = 'Webhook URL is required'
    else if (!isValidUrl(trimmedWebhookUrl)) e.webhook_url = 'Must be a valid http/https URL'
    if (trimmedFallbackUrl && !isValidUrl(trimmedFallbackUrl)) {
      e.fallback_webhook_url = 'Must be a valid http/https URL'
    }
    if (rules.length === 0) e.rules = 'Add at least one alert rule'
    return e
  }

  async function checkNetworkMismatch(selectedNetwork: Network) {
    if (!window.freighter) return
    try {
      const walletNetwork = await window.freighter?.getNetwork()
      const networkMap: Record<string, string> = {
        testnet: 'TESTNET',
        mainnet: 'PUBLIC',
        futurenet: 'FUTURENET',
      }
      const expectedNetwork = networkMap[selectedNetwork]
      if (walletNetwork !== expectedNetwork) {
        setNetworkWarning(
          `Your wallet is on ${walletNetwork}, but this contract is on ${selectedNetwork.toUpperCase()}`
        )
      } else {
        setNetworkWarning(null)
      }
    } catch {
      setNetworkWarning(null)
    }
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    if (!isConnected) {
      setErrors({ wallet: 'Connect your Freighter wallet to save contracts' })
      return
    }

    setSaving(true)
    const now = Date.now()
    const contract: WatchedContract = {
      id: crypto.randomUUID(),
      label: label.trim(),
      contract_id: contractId.trim(),
      network,
      rules,
      webhook_url: webhookUrl.trim(),
      webhook_secret: webhookSecret.trim() || undefined,
      created_at: Date.now(),
      updated_at: Date.now(),
    }
    await addContract(contract)
    try {
      sessionStorage.setItem('txwatch_last_created_contract', contract.id)
    } catch {
      // ignore storage errors
    }
    setSaved(true)
    setToast({ message: `Contract "${contract.label}" saved successfully!`, type: 'success' })
    setTimeout(() => {
      router.push(`/contracts/${contract.id}`)
    }, 1500)
  }

  async function handleTestWebhook() {
    const trimmedWebhookUrl = webhookUrl.trim()
    if (!trimmedWebhookUrl || !isValidUrl(trimmedWebhookUrl)) {
      setErrors((e) => ({ ...e, webhook_url: 'Enter a valid URL to test' }))
      return
    }
    testAbortRef.current?.abort()
    const controller = new AbortController()
    testAbortRef.current = controller
    const trimmedContractId = contractId.trim()
    if (!trimmedContractId || !isValidContractId(trimmedContractId)) {
      setErrors((e) => ({ ...e, contract_id: 'Enter a valid contract ID before testing' }))
      return
    }
    setTestStatus('sending')
    setTestError(null)
    setTestStatusCode(null)
    try {
      const { status, ok } = await sendTestWebhook(
        trimmedWebhookUrl,
        trimmedContractId,
        network,
        controller.signal,
        signers.length > 0 ? signers : undefined
      )
      setTestStatusCode(status)
      if (ok) {
        setTestStatus('ok')
      } else {
        setTestStatus('error')
        setTestError(`Server responded with ${status}`)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={showLeaveConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved input on this form. Leaving now will lose your changes, including any alert rules."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={handleLeaveConfirm}
        onCancel={handleLeaveCancel}
      />
      <div className="max-w-2xl mx-auto space-y-8">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-zinc-500">
          <li>
            <Link href="/contracts" className="hover:text-zinc-300 transition-colors">
              Contracts
            </Link>
          </li>
          <li aria-hidden="true" className="text-zinc-600">/</li>
          <li aria-current="page" className="text-zinc-300">New</li>
        </ol>
      </nav>
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Add Contract</h1>
        <p className="text-sm text-zinc-500 mt-1">Register a Soroban contract to monitor</p>
      </div>

      {draftRestored && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
          <p className="text-sm text-indigo-300">Draft restored</p>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-sm font-medium text-indigo-300 hover:text-indigo-200 underline underline-offset-2 transition-colors"
          >
            Discard
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Label</label>
          <input
            type="text"
            placeholder="e.g. My DEX Contract"
            value={label}
            onChange={(e) => { setLabel(e.target.value); setErrors((prev) => ({ ...prev, label: undefined })) }}
            maxLength={100}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="flex justify-between items-start mt-1">
            <div>
              {errors.label && <p className="text-xs text-red-400">{errors.label}</p>}
            </div>
            <p className="text-xs text-zinc-500">{label.length}/100</p>
          </div>
        </div>

        {/* Contract ID */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Contract ID</label>
          <input
            type="text"
            placeholder="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
            value={contractId}
            onChange={(e) => { setContractId(e.target.value); setErrors((prev) => ({ ...prev, contract_id: undefined })); setContractCheck('idle') }}
            onBlur={(e) => runContractCheck(e.target.value, network)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <p className="mt-1.5 text-xs text-zinc-400">Soroban contract addresses start with <span className="font-mono">C</span> and are 56 characters long</p>
          {contractCheck === 'checking' && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" aria-hidden="true" />
              Checking…
            </p>
          )}
          {contractCheck === 'found' && <p className="mt-1 text-xs text-emerald-400">Contract found</p>}
          {contractCheck === 'not_found' && (
            <p className="mt-1 text-xs text-amber-400">Not found on {network.charAt(0).toUpperCase() + network.slice(1)} — you can still save</p>
          )}
          {contractCheck === 'error' && <p className="mt-1 text-xs text-zinc-500">Could not verify (RPC unavailable)</p>}
          {errors.contract_id && <p className="mt-1 text-xs text-red-400">{errors.contract_id}</p>}
        </div>

        {/* Network */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Network</label>
          <select
            value={network}
            onChange={(e) => {
              const newNetwork = e.target.value as Network
              setNetwork(newNetwork)
              checkNetworkMismatch(newNetwork)
              checkNetworkMismatch(newNetwork)
            }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="testnet">Testnet</option>
            <option value="mainnet">Mainnet</option>
            <option value="futurenet">Futurenet</option>
          </select>
          {networkWarning && (
            <p className="mt-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-3 py-2">
              ⚠️ {networkWarning}
            </p>
          )}
        </div>

        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://your-server.com/webhook"
              value={webhookUrl}
              onChange={(e) => {              setWebhookUrl(e.target.value); setErrors((prev) => ({ ...prev, webhook_url: undefined })); setTestStatus('idle'); setTestStatusCode(null) }}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testStatus === 'sending'}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {testStatus === 'sending' && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {testStatus === 'sending' ? 'Sending…' : testStatus === 'ok' ? `${testStatusCode} OK` : testStatus === 'error' ? `${testStatusCode ?? 'ERR'} Failed` : 'Test'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">HTTP and HTTPS are supported. Example: <span className="font-mono">https://api.example.com/alerts</span></p>
          {errors.webhook_url && <p className="mt-1 text-xs text-red-400">{errors.webhook_url}</p>}
          {testStatus === 'error' && testError && <p className="mt-1 text-xs text-red-400">{testError}</p>}
          {testStatus === 'ok' && <p className="mt-1 text-xs text-emerald-400">Test payload delivered — {testStatusCode} received</p>}
        </div>

        {/* Webhook Secret */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Webhook Secret (Optional)</label>
          <div className="flex gap-2">
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder="Your HMAC secret key"
              value={webhookSecret}
              onChange={(e) => { setWebhookSecret(e.target.value); setErrors((prev) => ({ ...prev, webhook_secret: undefined })) }}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="px-3 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors whitespace-nowrap"
            >
              {showSecret ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">Used to sign payloads with HMAC-SHA256. Receivers can verify the X-TxWatch-Signature header.</p>
        </div>

        {/* Alert Rules */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Alert Rules</label>
          <RuleBuilder
            rules={rules}
            onChange={setRules}
            contractId={contractId.trim() || undefined}
            network={network}
          />
          {errors.rules && <p className="mt-1 text-xs text-red-400">{errors.rules}</p>}
        </div>

        {/* Wallet Connection */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Wallet</label>
          <FreighterConnect onConnect={handleWalletConnect} />
        </div>

        {errors.wallet && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {errors.wallet}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
          >
            {saving ? 'Saving...' : 'Save Contract'}
          </button>
          <button
            type="button"
            onClick={() => requestNavigation(null)}
            className="px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

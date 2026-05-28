'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertRule, Network, WatchedContract } from '@/types'
import { isValidContractId, isValidUrl } from '@/lib/stellar'
import { saveContract } from '@/lib/storage'
import { sendTestWebhook } from '@/lib/api'
import { useWallet } from '@/lib/useWallet'
import RuleBuilder from '@/components/RuleBuilder'

interface FormErrors {
  label?: string
  contract_id?: string
  webhook_url?: string
  rules?: string
  wallet?: string
}

export default function NewContractPage() {
  const router = useRouter()
  const { publicKey, isConnected } = useWallet()
  const [label, setLabel] = useState('')
  const [contractId, setContractId] = useState('')
  const [network, setNetwork] = useState<Network>('testnet')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [rules, setRules] = useState<AlertRule[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [testError, setTestError] = useState<string | null>(null)

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!label.trim()) e.label = 'Label is required'
    if (!contractId.trim()) e.contract_id = 'Contract ID is required'
    else if (!isValidContractId(contractId.trim())) e.contract_id = 'Must be a valid Soroban contract address (starts with C, 56 chars)'
    if (!webhookUrl.trim()) e.webhook_url = 'Webhook URL is required'
    else if (!isValidUrl(webhookUrl.trim())) e.webhook_url = 'Must be a valid http/https URL'
    if (rules.length === 0) e.rules = 'Add at least one alert rule'
    return e
  }

  function isWalletConnected(): boolean {
    return isConnected && !!publicKey
  }

  async function handleSave() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }

    if (!isWalletConnected()) {
      setErrors({ wallet: 'Connect your Freighter wallet to save contracts' })
      return
    }

    setSaving(true)
    const contract: WatchedContract = {
      id: crypto.randomUUID(),
      label: label.trim(),
      contract_id: contractId.trim(),
      network,
      rules,
      webhook_url: webhookUrl.trim(),
      created_at: Date.now(),
    }
    saveContract(contract)
    router.push(`/contracts/${contract.id}`)
  }

  async function handleTestWebhook() {
    if (!webhookUrl.trim() || !isValidUrl(webhookUrl.trim())) {
      setErrors((e) => ({ ...e, webhook_url: 'Enter a valid URL to test' }))
      return
    }
    setTestStatus('sending')
    setTestError(null)
    try {
      await sendTestWebhook(webhookUrl.trim(), contractId.trim() || 'TEST_CONTRACT')
      setTestStatus('ok')
    } catch (err) {
      setTestStatus('error')
      setTestError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Add Contract</h1>
        <p className="text-sm text-zinc-500 mt-1">Register a Soroban contract to monitor</p>
      </div>

      <div className="space-y-5">
        {/* Label */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Label</label>
          <input
            type="text"
            placeholder="e.g. My DEX Contract"
            value={label}
            onChange={(e) => { setLabel(e.target.value); setErrors((prev) => ({ ...prev, label: undefined })) }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {errors.label && <p className="mt-1 text-xs text-red-400">{errors.label}</p>}
        </div>

        {/* Contract ID */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Contract ID</label>
          <input
            type="text"
            placeholder="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
            value={contractId}
            onChange={(e) => { setContractId(e.target.value); setErrors((prev) => ({ ...prev, contract_id: undefined })) }}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {errors.contract_id && <p className="mt-1 text-xs text-red-400">{errors.contract_id}</p>}
        </div>

        {/* Network */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Network</label>
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as Network)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="testnet">Testnet</option>
            <option value="mainnet">Mainnet</option>
            <option value="futurenet">Futurenet</option>
          </select>
        </div>

        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Webhook URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://your-server.com/webhook"
              value={webhookUrl}
              onChange={(e) => { setWebhookUrl(e.target.value); setErrors((prev) => ({ ...prev, webhook_url: undefined })); setTestStatus('idle') }}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <button
              type="button"
              onClick={handleTestWebhook}
              disabled={testStatus === 'sending'}
              className="px-3 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {testStatus === 'sending' ? 'Sending…' : testStatus === 'ok' ? '✓ Sent' : testStatus === 'error' ? '✗ Failed' : 'Test'}
            </button>
          </div>
          {errors.webhook_url && <p className="mt-1 text-xs text-red-400">{errors.webhook_url}</p>}
          {testStatus === 'error' && testError && <p className="mt-1 text-xs text-red-400">{testError}</p>}
          {testStatus === 'ok' && <p className="mt-1 text-xs text-emerald-400">Test payload delivered successfully</p>}
        </div>

        {/* Alert Rules */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Alert Rules</label>
          <RuleBuilder rules={rules} onChange={setRules} />
          {errors.rules && <p className="mt-1 text-xs text-red-400">{errors.rules}</p>}
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
          >
            {saving ? 'Saving…' : 'Save Contract'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

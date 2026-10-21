import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertRule, Network, WatchedContract } from '@/types'
import { isValidContractId, isValidUrl } from '@/lib/stellar'
import { saveContract, getContracts } from '@/lib/storage'
import { sendTestWebhook } from '@/lib/api'
import { useFreighterConnection } from '@/lib/useFreighterConnection'

interface FormErrors {
  label?: string
  contract_id?: string
  webhook_url?: string
  rules?: string
  wallet?: string
  network?: string
}

export function useNewContractForm() {
  const router = useRouter()
  const {
    isConnected,
    publicKey,
  } = useFreighterConnection()

  const [label, setLabel] = useState('')
  const [contractId, setContractId] = useState('')
  const [network, setNetwork] = useState<Network>('testnet')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [rules, setRules] = useState<AlertRule[]>([])
  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)
  const [testStatus, setTestStatus] = useState<
    'idle' | 'sending' | 'ok' | 'error'
  >('idle')
  const [testError, setTestError] = useState<string | null>(null)
  const [testStatusCode, setTestStatusCode] = useState<number | null>(null)
  const [toast, setToast] = useState<
    { message: string; type: 'success' | 'error' } | null
  >(null)
  const [networkWarning, setNetworkWarning] = useState<string | null>(null)
  const testAbortRef = useRef<AbortController | null>(null)

  useEffect(() => () => testAbortRef.current?.abort(), [])

  function handleWalletConnect() {
    setErrors((prev) => ({ ...prev, wallet: undefined }))
  }

  function validate(): FormErrors {
    const e: FormErrors = {}
    const trimmedLabel = label.trim()
    const trimmedContractId = contractId.trim()
    const trimmedWebhookUrl = webhookUrl.trim()

    if (!trimmedLabel) e.label = 'Label is required'
    if (!trimmedContractId) e.contract_id = 'Contract ID is required'
    else if (!isValidContractId(trimmedContractId))
      e.contract_id =
        'Must be a valid Soroban contract address (starts with C, 56 chars)'
    else {
      const isDuplicate = getContracts().some(
        (c) =>
          c.contract_id === trimmedContractId && c.network === network
      )
      if (isDuplicate)
        e.contract_id = `This contract is already registered on ${network}`
    }
    if (!trimmedWebhookUrl) e.webhook_url = 'Webhook URL is required'
    else if (!isValidUrl(trimmedWebhookUrl))
      e.webhook_url = 'Must be a valid http/https URL'
    if (rules.length === 0) e.rules = 'Add at least one alert rule'
    return e
  }

  function isFormValid(): boolean {
    return (
      label.trim().length > 0 &&
      label.length <= 100 &&
      contractId.trim().length > 0 &&
      isValidContractId(contractId.trim()) &&
      webhookUrl.trim().length > 0 &&
      isValidUrl(webhookUrl.trim()) &&
      rules.length > 0
    )
  }

  function isWalletConnected(): boolean {
    return isConnected && !!publicKey
  }

  async function checkNetworkMismatch(selectedNetwork: Network) {
    if (!window.freighter) return
    try {
      const walletNetwork = await window.freighter.getNetwork()
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
    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }

    if (!isConnected) {
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
    try {
      sessionStorage.setItem('txwatch_last_created_contract', contract.id)
    } catch {
      // ignore storage errors
    }
    setToast({
      message: `Contract "${contract.label}" saved successfully!`,
      type: 'success',
    })
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
      const { status, ok } = await sendTestWebhook(trimmedWebhookUrl, trimmedContractId, network, controller.signal)
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

  return {
    label,
    setLabel,
    contractId,
    setContractId,
    network,
    setNetwork,
    webhookUrl,
    setWebhookUrl,
    rules,
    setRules,
    errors,
    setErrors,
    saving,
    setSaving,
    testStatus,
    setTestStatus,
    testError,
    setTestError,
    testStatusCode,
    setTestStatusCode,
    toast,
    setToast,
    networkWarning,
    setNetworkWarning,
    isConnected,
    publicKey,
    handleWalletConnect,
    validate,
    isFormValid,
    isWalletConnected,
    checkNetworkMismatch,
    handleSave,
    handleTestWebhook,
  }
}

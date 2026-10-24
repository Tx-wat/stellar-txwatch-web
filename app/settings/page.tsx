'use client'

import { useEffect, useRef, useState } from 'react'
import { getApiKey, setApiKey, clearApiKey } from '@/lib/storage'
import { testApiConnection } from '@/lib/api'
import Toast from '@/components/Toast'

type TestStatus = 'idle' | 'testing' | 'ok' | 'error'

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const [apiKey, setApiKeyState] = useState('')
  const [inputKey, setInputKey] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const testAbortRef = useRef<AbortController | null>(null)

  const apiConfigured = !!process.env.NEXT_PUBLIC_API_URL

  // Hydrate stored key on client mount
  useEffect(() => {
    const stored = getApiKey()
    if (stored) {
      setApiKeyState(stored)
      setInputKey(stored)
    }
    setMounted(true)
  }, [])

  // Cancel any in-flight connection test on unmount
  useEffect(() => () => testAbortRef.current?.abort(), [])

  function maskKey(key: string): string {
    if (key.length <= 8) return '•'.repeat(key.length)
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4)
  }

  function handleSave() {
    const trimmed = inputKey.trim()
    if (!trimmed) {
      setToast({ message: 'API key cannot be empty', type: 'error' })
      return
    }
    setSaving(true)
    setApiKey(trimmed)
    setApiKeyState(trimmed)
    setSaving(false)
    setEditing(false)
    setTestStatus('idle')
    setTestMessage(null)
    setToast({ message: 'API key saved', type: 'success' })
  }

  function handleClear() {
    clearApiKey()
    setApiKeyState('')
    setInputKey('')
    setRevealed(false)
    setEditing(false)
    setTestStatus('idle')
    setTestMessage(null)
    setToast({ message: 'API key cleared', type: 'success' })
  }

  function handleCancelEdit() {
    setInputKey(apiKey)
    setEditing(false)
  }

  async function handleTestConnection() {
    if (!apiConfigured) {
      setTestStatus('error')
      setTestMessage('NEXT_PUBLIC_API_URL is not configured. Set it in .env.local to enable backend connection.')
      return
    }
    testAbortRef.current?.abort()
    const controller = new AbortController()
    testAbortRef.current = controller

    setTestStatus('testing')
    setTestMessage(null)

    try {
      const result = await testApiConnection()
      setTestStatus(result.ok ? 'ok' : 'error')
      setTestMessage(result.message)
    } catch (err) {
      setTestStatus('error')
      setTestMessage(err instanceof Error ? err.message : 'Connection failed')
    }
  }

  if (!mounted) return null

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage your API key for txwatch-core backend authentication</p>
        </div>

        {/* API Mode banner */}
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          apiConfigured
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          {apiConfigured
            ? '✓ Backend API mode active — requests will be authenticated with your API key.'
            : '⚠ NEXT_PUBLIC_API_URL is not set. The app is running in local/mock mode. Set NEXT_PUBLIC_API_URL in .env.local to use the backend.'}
        </div>

        {/* API Key card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">API Key</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Stored locally in your browser under <code className="text-zinc-400 font-mono">txwatch_api_key</code>.
              Sent as a Bearer token on every request to the txwatch-core API.
            </p>
          </div>

          {apiKey && !editing ? (
            <>
              {/* Display saved key */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Current Key</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-100 overflow-x-auto">
                    {revealed ? apiKey : maskKey(apiKey)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRevealed((r) => !r)}
                    className="px-3 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors whitespace-nowrap"
                    aria-label={revealed ? 'Hide key' : 'Reveal key'}
                  >
                    {revealed ? 'Hide' : 'Reveal'}
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setEditing(true); setInputKey(apiKey); setRevealed(false) }}
                  className="px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-4 py-2 rounded-lg border border-red-700 hover:border-red-500 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Input new key */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  {apiKey ? 'New API Key' : 'Enter API Key'}
                </label>
                <input
                  type={revealed ? 'text' : 'password'}
                  placeholder="Paste your txwatch-core API key"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !inputKey.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Key'}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setRevealed((r) => !r)}
                  className="px-3 py-2.5 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
                >
                  {revealed ? 'Hide' : 'Reveal'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Test Connection card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Test Connection</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Pings the txwatch-core <code className="text-zinc-400 font-mono">/health</code> endpoint with your stored API key.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !apiKey}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-white transition-colors"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>

            {testStatus === 'ok' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            )}
            {testStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Failed
              </span>
            )}
          </div>

          {testMessage && (
            <div className={`text-sm rounded-lg px-3 py-2 border ${
              testStatus === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {testMessage}
            </div>
          )}

          {!apiKey && (
            <p className="text-xs text-zinc-500">
              Save an API key first to test the connection.
            </p>
          )}
        </div>
      </div>
    </>
  )
}

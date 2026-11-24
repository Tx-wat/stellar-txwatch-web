'use client'

import { useCallback, useEffect, useState } from 'react'
import { Networks } from '@stellar/stellar-sdk'
import { getNetworkDetails, requestAccess } from '@stellar/freighter-api'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import {
  classifyFreighterError,
  useFreighterStatus,
} from '@/hooks/useFreighterStatus'

const KNOWN_PASSPHRASES = [Networks.PUBLIC, Networks.TESTNET, Networks.FUTURENET]

function displayError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/lock/i.test(message)) return 'Wallet is locked'
  if (/not installed|not available/i.test(message)) {
    return 'Freighter not installed - install the extension and reload'
  }
  if (/denied|not allowed|permission/i.test(message)) {
    return 'Connection rejected / not allowed'
  }
  return 'Connection rejected'
}

interface FreighterConnectProps {
  className?: string
  onConnect?: (publicKey: string) => void
  /** Overridable in tests; production uses the standard five-second interval. */
  pollIntervalMs?: number
}

export default function FreighterConnect({
  onConnect,
  className = '',
  pollIntervalMs,
}: FreighterConnectProps) {
  const { status, publicKey, refresh } = useFreighterStatus(pollIntervalMs)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [customNetwork, setCustomNetwork] = useState(false)

  const connectedKey = dismissed ? null : publicKey
  const isLocked = !dismissed && status === 'locked'

  useEffect(() => {
    if (connectedKey) onConnect?.(connectedKey)
  }, [connectedKey, onConnect])

  // Keep the network warning in sync with the wallet reported by Freighter.
  useEffect(() => {
    if (!connectedKey) return
    let cancelled = false

    async function checkNetwork() {
      let passphrase: string | undefined
      try {
        const injected = window.freighter
        const details = injected?.getNetworkDetails
          ? await injected.getNetworkDetails()
          : await getNetworkDetails()
        passphrase = details?.networkPassphrase
      } catch {
        // Network detection is best-effort; a missing API is not a mismatch.
      }
      if (!cancelled) {
        setCustomNetwork(Boolean(passphrase && !KNOWN_PASSPHRASES.includes(passphrase)))
      }
    }

    void checkNetwork()
    return () => {
      cancelled = true
    }
  }, [connectedKey])

  const connect = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDismissed(false)

    try {
      const injected = window.freighter
      const key = injected ? await injected.getPublicKey() : await requestAccess()
      if (!key) throw new Error('Connection rejected')

      window.__freighterPublicKey = key
      try {
        localStorage.setItem(STORAGE_KEYS.FREIGHTER_PUBLIC_KEY, key)
      } catch {
        // Non-fatal: the in-memory key is enough for this session.
      }
      onConnect?.(key)
      await refresh()
    } catch (err) {
      setError(displayError(err))
      if (classifyFreighterError(err) === 'unavailable') {
        window.open('https://www.freighter.app/', '_blank')
      }
    } finally {
      setLoading(false)
    }
  }, [onConnect, refresh])

  function disconnect() {
    setDismissed(true)
    setError(null)
    window.__freighterPublicKey = null
    try {
      localStorage.removeItem(STORAGE_KEYS.FREIGHTER_PUBLIC_KEY)
    } catch {
      // Ignore storage failures.
    }
  }

  const statusMessage = error ?? (isLocked ? 'Wallet is locked' : null)

  if (connectedKey) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" aria-hidden="true" />
        <span className="text-sm text-zinc-300 font-mono">
          {connectedKey.slice(0, 4)}…{connectedKey.slice(-4)}
        </span>
        {customNetwork && (
          <span className="text-xs text-amber-400" role="status">
            Wallet is on a custom network
          </span>
        )}
        <button
          type="button"
          onClick={disconnect}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={connect}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        )}
        Connect Freighter
      </button>
      {statusMessage && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {statusMessage}
          {statusMessage.startsWith('Freighter not installed') && (
            <>
              {' '}
              <a
                href="https://www.freighter.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-red-300"
              >
                Install Freighter
              </a>
            </>
          )}
        </p>
      )}
    </div>
  )
}

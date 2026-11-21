'use client'

import { useState, useEffect } from 'react'
import { Networks } from '@stellar/stellar-sdk'
import {
  isConnected,
  requestAccess,
  getPublicKey,
  getNetworkDetails,
} from '@stellar/freighter-api'
import { STORAGE_KEYS } from '@/lib/storageKeys'

type FreighterErrorState =
  | 'not-installed'
  | 'not-allowed'
  | 'locked'
  | 'unknown'
  | null

function classifyError(err: unknown): { state: FreighterErrorState; message: string } {
  const raw = err instanceof Error ? err.message : String(err)
  const message = raw.toLowerCase()
  if (/lock/i.test(message)) {
    return { state: 'locked', message: 'Freighter is locked — unlock it and try again' }
  }
  if (/denied|rejected|not allowed|permission/i.test(message)) {
    return { state: 'not-allowed', message: 'Connection rejected' }
  }
  if (/not installed|not available/i.test(message)) {
    return { state: 'not-installed', message: 'Freighter not installed - install the extension and reload' }
  }
  return { state: 'unknown', message: raw || 'Connection rejected' }
}

function getNetworkWarning(passphrase: string | null): string | null {
  if (!passphrase) return null
  const known = [Networks.PUBLIC, Networks.TESTNET, Networks.FUTURENET]
  if (!known.includes(passphrase as typeof Networks.PUBLIC)) {
    return 'Wallet is on a custom network'
  }
  return null
}

const WALLET_STORAGE_KEY = STORAGE_KEYS.FREIGHTER_PUBLIC_KEY

interface FreighterConnectProps {
  className?: string
  onConnect?: (publicKey: string) => void
}

export default function FreighterConnect({ onConnect, className = '' }: FreighterConnectProps) {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<FreighterErrorState>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    checkConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkConnection() {
    try {
      const connected = await isConnected()
      if (!connected) return

      const key = await getPublicKey()
      if (!key) return

      setPublicKey(key)
      window.__freighterPublicKey = key
      onConnect?.(key)

      try {
        // Try the imported API first; fall back to the window.freighter extension object
        // (the latter is used by test setups that mock window.freighter directly)
        let details = await getNetworkDetails().catch(() => null)
        if (!details?.networkPassphrase && window.freighter && 'getNetworkDetails' in window.freighter) {
          details = await (window.freighter as any).getNetworkDetails().catch(() => null)
        }
        setNetworkPassphrase(details?.networkPassphrase ?? null)
      } catch {
        setNetworkPassphrase(null)
      }
    } catch {
      // silent — connection check on mount
    } finally {
      setIsInitializing(false)
    }
  }

  async function connect() {
    if (isConnecting) return
    setIsConnecting(true)
    setLoading(true)
    setError(null)
    setErrorState(null)

    try {
      // requestAccess returns the public key on success, or throws on rejection
      const key = await requestAccess()
      if (!key) {
        setError('Connection rejected')
        return
      }

      let passphrase: string | null = null
      try {
        // Try the imported API first; fall back to the window.freighter extension object
        let details = await getNetworkDetails().catch(() => null)
        if (!details?.networkPassphrase && window.freighter && 'getNetworkDetails' in window.freighter) {
          details = await (window.freighter as any).getNetworkDetails().catch(() => null)
        }
        passphrase = details?.networkPassphrase ?? null
      } catch {
        passphrase = null
      }

      setPublicKey(key)
      setNetworkPassphrase(passphrase)
      window.__freighterPublicKey = key
      localStorage.setItem(WALLET_STORAGE_KEY, key)
      onConnect?.(key)
    } catch (err) {
      const classified = classifyError(err)
      setErrorState(classified.state)
      setError(classified.message)
      if (classified.state === 'not-installed') {
        window.open('https://www.freighter.app/', '_blank')
      }
    } finally {
      setLoading(false)
      setIsConnecting(false)
    }
  }

  function disconnect() {
    setPublicKey(null)
    setNetworkPassphrase(null)
    setError(null)
    setErrorState(null)
    localStorage.removeItem(WALLET_STORAGE_KEY)
  }

  const networkWarning = getNetworkWarning(networkPassphrase)

  if (isInitializing) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-24 h-9 rounded-lg bg-zinc-800 animate-pulse" />
      </div>
    )
  }

  if (publicKey) {
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-sm text-zinc-300 font-mono">
            {publicKey.slice(0, 4)}…{publicKey.slice(-4)}
          </span>
          <button
            onClick={disconnect}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Disconnect
          </button>
        </div>
        {networkWarning && (
          <p className="text-xs text-amber-400" role="alert">{networkWarning}</p>
        )}
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        onClick={connect}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium text-white transition-colors"
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )}
        Connect Freighter
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400" role="alert">
          {error}
          {errorState === 'not-installed' && (
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

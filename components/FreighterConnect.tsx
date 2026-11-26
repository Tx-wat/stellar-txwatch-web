'use client'

import { useState, useEffect } from 'react'
import {
  isConnected as freighterIsConnected,
  requestAccess,
  getPublicKey,
} from '@stellar/freighter-api'
import { STORAGE_KEYS } from '@/lib/storageKeys'

type FreighterErrorState = 'not-installed' | 'not-allowed' | 'locked' | 'unknown' | null

interface FreighterConnectProps {
  className?: string
  onConnect?: (publicKey: string) => void
}

const WALLET_STORAGE_KEY = STORAGE_KEYS.FREIGHTER_PUBLIC_KEY

export default function FreighterConnect({ onConnect, className = '' }: FreighterConnectProps) {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<FreighterErrorState>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    checkConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function checkConnection() {
    try {
      const { isConnected: connected, error: checkError } = await freighterIsConnected()
      if (checkError) {
        setIsInitializing(false)
        return
      }

      if (connected) {
        const { publicKey: key, error: keyError } = await getPublicKey()
        if (!keyError && key) {
          setPublicKey(key)
          window.__freighterPublicKey = key
          onConnect?.(key)
        }
      }
    } catch {
      // silent — connection check on mount
    } finally {
      setIsInitializing(false)
    }
  }

  async function connect() {
    setLoading(true)
    setError(null)
    setErrorState(null)

    try {
      const { isConnected: installed, error: checkError } = await freighterIsConnected()
      if (checkError || !installed) {
        setErrorState('not-installed')
        setError('Freighter not installed - install the extension and reload')
        return
      }

      const { address, error: accessError } = await requestAccess()
      if (accessError) {
        if (accessError.code === 'NOT_ALLOWED') {
          setErrorState('not-allowed')
          setError('Connection rejected / permission denied')
        } else if (accessError.code === 'LOCKED') {
          setErrorState('locked')
          setError('Freighter is locked - unlock it and try again')
        } else {
          setErrorState('unknown')
          setError('Connection rejected')
        }
        return
      }

      if (!address) {
        setError('Failed to retrieve wallet information')
        return
      }

      setPublicKey(address)
      window.__freighterPublicKey = address
      localStorage.setItem(WALLET_STORAGE_KEY, address)
      onConnect?.(address)
    } catch (err) {
      setErrorState('unknown')
      setError(err instanceof Error ? err.message : 'Connection rejected')
    } finally {
      setLoading(false)
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

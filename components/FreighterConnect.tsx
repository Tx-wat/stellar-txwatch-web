'use client'

import { useState, useEffect } from 'react'

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>
      getPublicKey: () => Promise<string>
      getNetwork: () => Promise<string>
    }
  }
}

interface FreighterConnectProps {
  onConnect?: (publicKey: string) => void
  className?: string
}

export default function FreighterConnect({ onConnect, className = '' }: FreighterConnectProps) {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await window.freighter?.isConnected()
        if (connected) {
          const key = await window.freighter!.getPublicKey()
          const network = await window.freighter!.getNetwork()
          if (key && network) {
            setPublicKey(key)
            onConnect?.(key)
          }
        }
      } catch (err) {
        console.error('Freighter connection check failed:', err)
        setError('Failed to check wallet connection')
      }
    }
    checkConnection()
  }, [onConnect])

  async function connect() {
    setLoading(true)
    setError(null)
    try {
      if (!window.freighter) {
        window.open('https://www.freighter.app/', '_blank')
        setError('Freighter not installed — install the extension and reload')
        return
      }
      const key = await window.freighter.getPublicKey()
      const network = await window.freighter.getNetwork()
      if (!key || !network) {
        setError('Failed to retrieve wallet information')
        return
      }
      setPublicKey(key)
      onConnect?.(key)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection rejected'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function disconnect() {
    setPublicKey(null)
  }

  if (publicKey) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
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
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

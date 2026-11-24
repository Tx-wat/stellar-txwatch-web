'use client'

import { useEffect, useState } from 'react'
import { Networks } from '@stellar/stellar-sdk'
import {
  getPublicKey as sdkGetPublicKey,
  getNetworkDetails as sdkGetNetworkDetails,
  isConnected as sdkIsConnected,
} from '@stellar/freighter-api'

export type KnownNetwork = 'PUBLIC' | 'TESTNET' | 'FUTURENET' | 'CUSTOM'
export type FreighterStatus =
  | 'idle'
  | 'disconnected'
  | 'not-installed'
  | 'locked'
  | 'not-allowed'
  | 'connected'
  | 'error'

export function getKnownNetworkFromPassphrase(
  passphrase: string | null | undefined
): KnownNetwork {
  if (!passphrase) return 'CUSTOM'
  switch (passphrase) {
    case Networks.PUBLIC:
      return 'PUBLIC'
    case Networks.TESTNET:
      return 'TESTNET'
    case Networks.FUTURENET:
      return 'FUTURENET'
    default:
      return 'CUSTOM'
  }
}

function statusFromError(error: unknown): FreighterStatus {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/lock/i.test(message)) return 'locked'
  if (/allow|permission|denied|reject/i.test(message)) return 'not-allowed'
  if (/install|not available/i.test(message)) return 'not-installed'
  return 'error'
}

export function useFreighterConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<FreighterStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkConnection() {
      setLoading(true)
      setError(null)
      try {
        const wallet = typeof window === 'undefined' ? undefined : window.freighter
        const connected = wallet ? await wallet.isConnected() : await sdkIsConnected()

        if (!connected) {
          if (!cancelled) {
            setIsConnected(false)
            setPublicKey(null)
            setStatus('disconnected')
          }
          return
        }

        const key = wallet ? await wallet.getPublicKey() : await sdkGetPublicKey()
        if (!key) throw new Error('Freighter is locked')

        let passphrase: string | null = null
        if (wallet?.getNetworkDetails) {
          passphrase = (await wallet.getNetworkDetails()).networkPassphrase
        } else if (wallet?.getNetwork) {
          passphrase = await wallet.getNetwork()
        } else {
          passphrase = (await sdkGetNetworkDetails()).networkPassphrase
        }

        if (!cancelled) {
          setPublicKey(key)
          setIsConnected(true)
          setNetworkPassphrase(passphrase)
          setStatus('connected')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown Freighter error'
        if (!cancelled) {
          setStatus(statusFromError(err))
          setError(message)
          setIsConnected(false)
          setPublicKey(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void checkConnection()
    return () => {
      cancelled = true
    }
  }, [])

  const knownNetwork = getKnownNetworkFromPassphrase(networkPassphrase)

  return {
    isConnected,
    publicKey,
    networkPassphrase,
    knownNetwork,
    loading,
    status,
    error,
  }
}

'use client'

import { useState, useEffect, useCallback } from 'react'

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>
      getPublicKey: () => Promise<string>
      getNetwork: () => Promise<string>
      signTransaction: (xdr: string, options: { networkPassphrase: string }) => Promise<string>
    }
  }
}

export interface FreighterState {
  publicKey: string | null
  network: string | null
  loading: boolean
  error: string | null
}

export function useFreighter() {
  const [state, setState] = useState<FreighterState>({
    publicKey: null,
    network: null,
    loading: false,
    error: null,
  })

  const initialize = useCallback(async () => {
    try {
      const connected = await window.freighter?.isConnected()
      if (connected) {
        const [publicKey, network] = await Promise.all([
          window.freighter!.getPublicKey(),
          window.freighter!.getNetwork(),
        ])
        setState({ publicKey, network, loading: false, error: null })
      }
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to initialize Freighter' }))
    }
  }, [])

  useEffect(() => {
    initialize()
  }, [initialize])

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      if (!window.freighter) {
        window.open('https://www.freighter.app/', '_blank')
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Freighter not installed — install the extension and reload',
        }))
        return
      }
      const [publicKey, network] = await Promise.all([
        window.freighter.getPublicKey(),
        window.freighter.getNetwork(),
      ])
      setState({ publicKey, network, loading: false, error: null })
    } catch {
      setState((prev) => ({ ...prev, loading: false, error: 'Connection rejected' }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({ publicKey: null, network: null, loading: false, error: null })
  }, [])

  return { ...state, connect, disconnect, initialize }
}

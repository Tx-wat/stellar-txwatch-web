'use client'

import { useState, useEffect, useCallback } from 'react'
import { Networks } from '@stellar/stellar-sdk'
import {
  getPublicKey as sdkGetPublicKey,
  getNetworkDetails as sdkGetNetworkDetails,
  isConnected as sdkIsConnected,
  requestAccess as sdkRequestAccess,
  isConnected,
  requestAccess,
  getPublicKey,
  getNetworkDetails,
} from '@stellar/freighter-api'

export type KnownNetwork = 'PUBLIC' | 'TESTNET' | 'FUTURENET' | 'custom'

export function getNetworkFromPassphrase(passphrase: string): KnownNetwork {
  switch (passphrase) {
    case Networks.PUBLIC:
      return 'PUBLIC'
    case Networks.TESTNET:
      return 'TESTNET'
    case Networks.FUTURENET:
      return 'FUTURENET'
    default:
      return 'custom'
  }
}

export interface FreighterState {
  publicKey: string | null
  network: string | null
  loading: boolean
  error: string | null
}

function injectedWallet() {
  return typeof window === 'undefined' ? undefined : window.freighter
}

function isLockError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return /lock/i.test(message)
}

export function useFreighter() {
  const [state, setState] = useState<FreighterState>({
    publicKey: null,
    network: null,
    loading: false,
    error: null,
  })

  const readWallet = useCallback(async () => {
    const wallet = injectedWallet()
    const connected = wallet ? await wallet.isConnected() : await sdkIsConnected()
    if (!connected) return { publicKey: null, network: null }

    const key = wallet ? await wallet.getPublicKey() : await sdkGetPublicKey()
    if (!key) throw new Error('Freighter is locked')

    let network: string | null = null
    if (wallet?.getNetworkDetails) {
      network = getNetworkFromPassphrase((await wallet.getNetworkDetails()).networkPassphrase)
    } else if (wallet?.getNetwork) {
      network = getNetworkFromPassphrase(await wallet.getNetwork())
    } else {
      const details = await sdkGetNetworkDetails()
      network = getNetworkFromPassphrase(details.networkPassphrase)
    }

    return { publicKey: key, network }
  }, [])

  const initialize = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const { publicKey, network } = await readWallet()
      setState({ publicKey, network, loading: false, error: null })
    } catch (error) {
      setState({
        publicKey: null,
        network: null,
        loading: false,
        error: isLockError(error) ? 'Freighter is locked' : 'Freighter not available',
      })
      const { isConnected: connected, error: connectedError } = await isConnected()
      if (connectedError) {
        setState((prev) => ({ ...prev, error: 'Freighter not installed' }))
        return
      }
      if (connected) {
        const [keyResult, networkResult] = await Promise.all([
          getPublicKey(),
          getNetworkDetails(),
        ])
        if (keyResult.error) {
          setState((prev) => ({ ...prev, error: 'Connection rejected' }))
          return
        }
        if (networkResult.error) {
          setState((prev) => ({ ...prev, error: 'Failed to initialize Freighter' }))
          return
        }
        setState({
          publicKey: keyResult.publicKey,
          network: networkResult.network,
          loading: false,
          error: null,
        })
      }
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to initialize Freighter' }))
    }
  }, [readWallet])

  useEffect(() => {
    void initialize()
  }, [initialize])

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const wallet = injectedWallet()
      if (!wallet) {
        await sdkRequestAccess()
      } else if (wallet.requestAccess) {
        await wallet.requestAccess()
      }
      const { publicKey, network } = await readWallet()
      setState({ publicKey, network, loading: false, error: null })
    } catch (error) {
      setState({
        publicKey: null,
        network: null,

      const accessResult = await requestAccess()
      if (accessResult.error) {
        const message = accessResult.error.code ?? ''
        const isLocked = message === 'LOCKED'
        setState((prev) => ({
          ...prev,
          loading: false,
          error: isLocked ? 'Freighter is locked' : 'Connection rejected',
        }))
        return
      }

      const [keyResult, networkResult] = await Promise.all([
        getPublicKey(),
        getNetworkDetails(),
      ])
      if (keyResult.error) {
        setState((prev) => ({ ...prev, loading: false, error: 'Connection rejected' }))
        return
      }
      if (networkResult.error) {
        setState((prev) => ({ ...prev, loading: false, error: 'Failed to initialize Freighter' }))
        return
      }

      setState({
        publicKey: keyResult.publicKey,
        network: networkResult.network,
        loading: false,
        error: isLockError(error) ? 'Freighter is locked' : 'Connection rejected',
      })
    }
  }, [readWallet])

  const disconnect = useCallback(() => {
    setState({ publicKey: null, network: null, loading: false, error: null })
  }, [])

  return { ...state, connect, disconnect, initialize }
}

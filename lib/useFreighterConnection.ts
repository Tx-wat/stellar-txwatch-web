import { useState, useEffect } from 'react'
import { Networks } from '@stellar/stellar-sdk'

export type KnownNetwork = 'PUBLIC' | 'TESTNET' | 'FUTURENET' | 'CUSTOM'

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

export function useFreighterConnection(): { isConnected: boolean; publicKey: string | null; loading: boolean } {
  const [isConnected, setIsConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [networkPassphrase, setNetworkPassphrase] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<FreighterStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setLoading(true)
    setError(null)
    try {
      const connectionResult = await isConnected()

      if (connectionResult.error) {
        // Distinguish "not installed" from other connection errors.
        const message = connectionResult.error.message || 'Freighter is not available'
        if (/install/i.test(message)) {
          setStatus('not-installed')
        } else {
          setStatus('error')
        }
        setError(message)
        setIsConnected(false)
        setPublicKey(null)
        return
      }
      const connected = await window.freighter?.isConnected()
      if (connected) {
        const key = await window.freighter?.getPublicKey()
        setPublicKey(key ?? null)
        setIsConnected(true)
        try {
          const details = await window.freighter.getNetworkDetails()
          setNetworkPassphrase(details?.networkPassphrase ?? null)
        } catch {
          setNetworkPassphrase(null)
        }
      } else {
        setIsConnected(false)
        setPublicKey(null)
        return
      }

      setPublicKey(keyResult.publicKey)
      setIsConnected(true)
      setStatus('connected')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown Freighter error'
      if (/lock/i.test(message)) {
        setStatus('locked')
      } else if (/allow|permission|denied/i.test(message)) {
        setStatus('not-allowed')
      } else if (/install/i.test(message)) {
        setStatus('not-installed')
      } else {
        setStatus('error')
      }
      setError(message)
      setIsConnected(false)
      setPublicKey(null)
    } finally {
      setLoading(false)
    }
  }

  const knownNetwork = getKnownNetworkFromPassphrase(networkPassphrase)

  return { isConnected, publicKey, networkPassphrase, knownNetwork, loading }
}
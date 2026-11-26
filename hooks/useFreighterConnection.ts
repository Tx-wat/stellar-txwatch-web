import { useState, useEffect } from 'react'
import { Networks } from '@stellar/stellar-sdk'
import {
  isConnected as freighterIsConnected,
  getPublicKey,
  getNetworkDetails,
} from '@stellar/freighter-api'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setLoading(true)
    try {
      const { isConnected: connected, error: checkError } = await freighterIsConnected()

      if (checkError) {
        setIsConnected(false)
        setPublicKey(null)
        return
      }

      if (connected) {
        const { publicKey: key, error: keyError } = await getPublicKey()
        if (!keyError && key) {
          setPublicKey(key)
          setIsConnected(true)
        } else {
          setIsConnected(false)
          setPublicKey(null)
        }
      } else {
        setIsConnected(false)
        setPublicKey(null)
      }
    } catch {
      setIsConnected(false)
      setPublicKey(null)
    } finally {
      setLoading(false)
    }
  }

  return { isConnected, publicKey, loading }
}
import { useState, useEffect } from 'react'

export function useFreighterConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    try {
      if (!window.freighter) {
        setIsConnected(false)
        setLoading(false)
        return
      }
      const connected = await window.freighter.isConnected()
      if (connected) {
        const key = await window.freighter.getPublicKey()
        setPublicKey(key)
        setIsConnected(true)
      } else {
        setIsConnected(false)
      }
    } catch {
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  return { isConnected, publicKey, loading }
}

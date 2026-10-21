import { useState, useEffect } from 'react'

export function useWallet(): { publicKey: string | null; isConnected: boolean } {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!window.freighter) return

    window.freighter?.isConnected().then(async (connected) => {
      setIsConnected(connected)
      if (connected) {
        const key = await window.freighter?.getPublicKey()
        setPublicKey(key ?? null)
      }
    })
  }, [])

  return { publicKey, isConnected }
}

import { useFreighterConnection } from './useFreighterConnection'

export function useWallet(): { publicKey: string | null; isConnected: boolean } {
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [isConnectedState, setIsConnected] = useState(false)

  useEffect(() => {
    let cancelled = false

    window.freighter?.isConnected().then(async (connected) => {
      setIsConnected(connected)
      if (connected) {
        const key = await window.freighter?.getPublicKey()
        setPublicKey(key ?? null)
      }
    }

    checkConnection()

    return () => {
      cancelled = true
    }
  }, [])

  return { publicKey, isConnected: isConnectedState }
}
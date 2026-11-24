'use client'

import { useFreighterStatus } from './useFreighterStatus'

/** Backwards-compatible wallet accessor backed by the shared, polled status. */
export function useWallet(): { publicKey: string | null; isConnected: boolean } {
  const { publicKey, isConnected } = useFreighterStatus()
  return { publicKey, isConnected }
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getPublicKey, isConnected } from '@stellar/freighter-api'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export type FreighterStatus =
  | 'unavailable'
  | 'disconnected'
  | 'connected'
  | 'locked'
  | 'not-allowed'
  | 'error'

export const FREIGHTER_POLL_INTERVAL_MS = 5000
export const FREIGHTER_STATUS_EVENT = 'txwatch:freighter-status'

interface ConnectionSnapshot {
  status: FreighterStatus
  publicKey: string | null
  error: string | null
}

export function classifyFreighterError(error: unknown): FreighterStatus {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (/lock/i.test(message)) return 'locked'
  if (/denied|reject|not allowed|permission/i.test(message)) return 'not-allowed'
  if (/not installed|not available/i.test(message)) return 'unavailable'
  return 'error'
}

function forgetCachedKey() {
  window.__freighterPublicKey = null
  try {
    localStorage.removeItem(STORAGE_KEYS.FREIGHTER_PUBLIC_KEY)
  } catch {
    // Storage may be unavailable (private browsing); the in-memory state is enough.
  }
}

function rememberCachedKey(key: string) {
  window.__freighterPublicKey = key
  try {
    localStorage.setItem(STORAGE_KEYS.FREIGHTER_PUBLIC_KEY, key)
  } catch {
    // Storage may be unavailable (private browsing); the in-memory state is enough.
  }
}

async function readConnection(): Promise<ConnectionSnapshot> {
  try {
    const injected = typeof window !== 'undefined' ? window.freighter : undefined
    const connected = injected ? await injected.isConnected() : await isConnected()

    if (!connected) {
      forgetCachedKey()
      return { status: 'disconnected', publicKey: null, error: null }
    }

    const key = injected ? await injected.getPublicKey() : await getPublicKey()
    if (!key) {
      forgetCachedKey()
      return { status: 'locked', publicKey: null, error: 'Wallet is locked' }
    }

    rememberCachedKey(key)
    return { status: 'connected', publicKey: key, error: null }
  } catch (error) {
    forgetCachedKey()
    const status = classifyFreighterError(error)
    const message = error instanceof Error ? error.message : 'Freighter connection failed'
    return { status, publicKey: null, error: message }
  }
}

/**
 * Shared, polled Freighter connection state.
 *
 * Freighter does not emit an event when the user locks the extension, so the
 * status is re-checked periodically. A status change is broadcast to every
 * consumer (FreighterConnect and WalletStatusBadge) so the whole UI updates
 * immediately, without waiting for a page refresh.
 */
export function useFreighterStatus(intervalMs = FREIGHTER_POLL_INTERVAL_MS) {
  const [snapshot, setSnapshot] = useState<ConnectionSnapshot>({
    status: 'disconnected',
    publicKey: null,
    error: null,
  })
  const previousStatus = useRef<FreighterStatus | null>(null)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    try {
      const next = await readConnection()
      setSnapshot((current) =>
        current.status === next.status &&
        current.publicKey === next.publicKey &&
        current.error === next.error
          ? current
          : next
      )
      if (previousStatus.current !== next.status) {
        previousStatus.current = next.status
        window.dispatchEvent(
          new CustomEvent<FreighterStatus>(FREIGHTER_STATUS_EVENT, { detail: next.status })
        )
      }
    } finally {
      inFlight.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const poll = () => {
      if (!cancelled) void refresh()
    }
    const onStatusEvent = () => poll()

    poll()
    const interval = setInterval(poll, intervalMs)
    window.addEventListener(FREIGHTER_STATUS_EVENT, onStatusEvent)

    return () => {
      cancelled = true
      clearInterval(interval)
      window.removeEventListener(FREIGHTER_STATUS_EVENT, onStatusEvent)
    }
  }, [intervalMs, refresh])

  return {
    status: snapshot.status,
    publicKey: snapshot.publicKey,
    error: snapshot.error,
    isConnected: snapshot.status === 'connected',
    refresh,
  }
}

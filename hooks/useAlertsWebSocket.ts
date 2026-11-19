'use client'

import { useEffect, useRef, useCallback } from 'react'
import { addAlert } from '@/lib/storage'
import type { AlertPayload } from '@/types'

/**
 * Connects to the txwatch-core WebSocket endpoint and dispatches incoming
 * alert events through `addAlert` so new deliveries appear without a page
 * refresh. Reconnects automatically on disconnect.
 *
 * Intended to be mounted once (e.g. in a root layout) when WebSocket
 * updates are desired; `enabled` gates the connection.
 */
export function useAlertsWebSocket(enabled: boolean) {
  const wsUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ALERTS_WS_URL
      ? process.env.NEXT_PUBLIC_ALERTS_WS_URL
      : ''
  const reconnectTimer = useRef<number | null>(null)

  const connect = useCallback(() => {
    if (!enabled || !wsUrl) return
    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
    } catch {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as AlertPayload
        if (payload && payload.transaction_hash) {
          addAlert(payload)
        }
      } catch {
        // Ignore malformed alert frames.
      }
    }

    ws.onclose = () => {
      scheduleReconnect()
    }

    ws.onerror = () => {
      ws.close()
    }

    function scheduleReconnect() {
      if (!enabled) return
      reconnectTimer.current = window.setTimeout(connect, 3000)
    }

    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      ws.close()
    }
  }, [enabled, wsUrl])

  useEffect(() => {
    const unsub = connect()
    return unsub
  }, [connect])
}

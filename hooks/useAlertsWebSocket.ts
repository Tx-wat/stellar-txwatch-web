'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useStorageAdapter } from '@/lib/StorageContext'
import type { AlertPayload } from '@/types'

/** WebSocket close codes that indicate an auth rejection. Never retry these. */
const AUTH_CLOSE_CODES = [4001, 4003]

/**
 * Connects to the txwatch-core WebSocket endpoint and dispatches incoming
 * alert events through `addAlert` so new deliveries appear without a page
 * refresh. Reconnects automatically on network drops but not on auth failures
 * (close codes 4001/4003).
 *
 * Intended to be mounted once (e.g. in a root layout) when WebSocket
 * updates are desired; `enabled` gates the connection.
 *
 * @param soundEnabled - Play a short Web Audio tone on each new alert.
 * @param pushEnabled  - Fire a browser push notification on each new alert.
 */
export function useAlertsWebSocket(enabled: boolean, soundEnabled?: boolean, pushEnabled?: boolean) {
  const adapter = useStorageAdapter()
  const wsUrl =
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ALERTS_WS_URL
      ? process.env.NEXT_PUBLIC_ALERTS_WS_URL
      : ''
  const reconnectTimer = useRef<number | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

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
      setAuthError(null)
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as AlertPayload
        if (payload && payload.transaction_hash) {
          adapter.addAlert(payload)

          if (soundEnabled) {
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
              const oscillator = ctx.createOscillator()
              const gain = ctx.createGain()
              oscillator.connect(gain)
              gain.connect(ctx.destination)
              oscillator.type = 'sine'
              oscillator.frequency.setValueAtTime(880, ctx.currentTime)
              gain.gain.setValueAtTime(0.1, ctx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
              oscillator.start(ctx.currentTime)
              oscillator.stop(ctx.currentTime + 0.4)
              oscillator.onended = () => ctx.close()
            } catch {
              // Browser autoplay policy or AudioContext not available — ignore silently.
            }
          }

          if (pushEnabled && 'Notification' in window) {
            if (Notification.permission === 'default') {
              Notification.requestPermission().then((perm) => {
                if (perm === 'granted') {
                  try {
                    new Notification(`Alert: ${payload.label}`, {
                      body: `Rule: ${payload.rule_triggered}`,
                      tag: payload.transaction_hash,
                    })
                  } catch {
                    // Notification failed
                  }
                }
              })
            } else if (Notification.permission === 'granted') {
              try {
                new Notification(`Alert: ${payload.label}`, {
                  body: `Rule: ${payload.rule_triggered}`,
                  tag: payload.transaction_hash,
                })
              } catch {
                // Notification failed
              }
            }
          }
        }
      } catch {
        // Ignore malformed alert frames.
      }
    }

    ws.onclose = (event) => {
      if (AUTH_CLOSE_CODES.includes(event.code)) {
        setAuthError(`WebSocket authentication failed (code ${event.code}). Check your API key in Settings.`)
        // Do not schedule a reconnect — retrying will not fix bad credentials.
        return
      }
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
  }, [enabled, wsUrl, adapter, soundEnabled, pushEnabled])

  useEffect(() => {
    const unsub = connect()
    return unsub
  }, [connect])

  return { authError }
}

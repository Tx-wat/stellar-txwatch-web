'use client'

import { useEffect, useRef } from 'react'
import { requestNotificationPermission, connectAlertWebSocket, showPushNotification } from '@/lib/api'
import { onAlertsChange } from '@/lib/storage'
import type { AlertPayload } from '@/types'

export default function WebPushNotifications() {
  const lastAlertTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    // Request Notification permission on first connection
    requestNotificationPermission().catch(() => {})

    // Connect to WebSocket real-time alerts
    const disconnectWs = connectAlertWebSocket({
      onAlert: (alert) => {
        lastAlertTimeRef.current = alert.timestamp || Date.now()
      },
    })

    // Listen to local alert changes across tabs or other events
    const unsubscribeAlerts = onAlertsChange(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        try {
          const raw = localStorage.getItem('txwatch_alerts')
          if (raw) {
            const alerts: AlertPayload[] = JSON.parse(raw)
            if (alerts.length > 0) {
              const latest = alerts[0]
              if (latest && latest.timestamp > lastAlertTimeRef.current) {
                lastAlertTimeRef.current = latest.timestamp
                showPushNotification(latest)
              }
            }
          }
        } catch {
          // ignore storage read errors
        }
      }
    })

    return () => {
      disconnectWs()
      unsubscribeAlerts()
    }
  }, [])

  return null
}

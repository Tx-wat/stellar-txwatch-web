'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertPayload } from '@/types'
import { getAlerts, addAlert, onAlertsChange } from '@/lib/storage'

export function useAlerts(contractId: string) {
  const [alerts, setAlerts] = useState<AlertPayload[]>([])

  const refresh = useCallback(() => {
    setAlerts(getAlerts(contractId))
  }, [contractId])

  useEffect(() => {
    refresh()
    const unsubscribe = onAlertsChange(refresh)
    return unsubscribe
  }, [refresh])

  function add(alert: AlertPayload): void {
    addAlert(alert)
    refresh()
  }

  return { alerts, add, refresh }
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertPayload } from '@/types'
import { useStorageAdapter } from '@/lib/StorageContext'

export function useAlerts(contractId: string | undefined) {
  const adapter = useStorageAdapter()
  const [alerts, setAlerts] = useState<AlertPayload[]>([])

  const refresh = useCallback(async () => {
    setAlerts(contractId ? await adapter.getAlerts(contractId) : [])
  }, [adapter, contractId])

  useEffect(() => {
    refresh()
    return adapter.subscribe((change) => {
      if (change === 'alerts') refresh()
    })
  }, [adapter, refresh])

  function add(alert: AlertPayload): void {
    addAlert(alert)
    refresh()
  }

  return { alerts, add, refresh }
}

export function useTodayAlertCount() {
  const adapter = useStorageAdapter()
  const [count, setCount] = useState(0)

  useEffect(() => {
    const refresh = async () => setCount(await adapter.getTodayAlertCount())
    refresh()
    return adapter.subscribe((change) => {
      if (change === 'alerts') refresh()
    })
  }, [adapter])

  return count
}

/**
 * Timestamp of the most recent alert for each contract, keyed by contract_id.
 * Computed in one pass and only recomputed when alerts change.
 */
export function useLastAlertTimes() {
  const adapter = useStorageAdapter()
  const [times, setTimes] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    const refresh = async () => {
      const next = await adapter.getLastAlertTimes()
      if (!cancelled) setTimes(next)
    }
    refresh()
    const unsubscribe = adapter.subscribe((change) => {
      if (change === 'alerts') refresh()
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [adapter])

  return times
}

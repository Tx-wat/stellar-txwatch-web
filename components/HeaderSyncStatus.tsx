'use client'

import { useContracts } from '@/hooks/useContracts'
import SyncIndicator from '@/components/SyncIndicator'

/**
 * Thin client component that lives in the header and displays the API sync
 * status badge when NEXT_PUBLIC_API_URL is configured.
 *
 * It passes `lastSyncedAt` down to SyncIndicator so the "Synced X ago" label
 * is always recalculated from the most recent successful sync — fixing the
 * stale time that persisted after a reconnect (#677).
 */
export default function HeaderSyncStatus() {
  const { apiEnabled, syncStatus, lastSyncedAt } = useContracts()

  if (!apiEnabled) return null

  return <SyncIndicator status={syncStatus} lastSyncedAt={lastSyncedAt} />
}

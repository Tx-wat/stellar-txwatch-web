'use client'

import { useContracts } from '@/hooks/useContracts'
import SyncIndicator from '@/components/SyncIndicator'

/**
 * Thin client component that lives in the header and displays the API sync
 * status badge when NEXT_PUBLIC_API_URL is configured.
 */
export default function HeaderSyncStatus() {
  const { syncStatus } = useContracts()
  const apiEnabled = !!process.env.NEXT_PUBLIC_API_URL

  if (!apiEnabled) return null

  return <SyncIndicator status={syncStatus} />
}

'use client'

import { SyncStatus } from '@/hooks/useContracts'
import { formatRelativeTime } from '@/lib/format'

interface SyncIndicatorProps {
  status: SyncStatus
  /** Unix ms timestamp of the last successful sync. When provided and status is
   *  'synced', the relative time is appended to the label. */
  lastSyncedAt?: number | null
}

const STATUS_CONFIG = {
  idle: {
    label: 'API Mode',
    dotClass: 'bg-indigo-500',
    textClass: 'text-indigo-400',
    title: 'Connected to TxWatch API',
  },
  syncing: {
    label: 'Syncing…',
    dotClass: 'bg-amber-400 animate-pulse',
    textClass: 'text-amber-400',
    title: 'Syncing contracts with API',
  },
  synced: {
    label: 'Synced',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    title: 'Contracts synced with API',
  },
  error: {
    label: 'Sync Error',
    dotClass: 'bg-red-500',
    textClass: 'text-red-400',
    title: 'Failed to sync with API — using local data',
  },
} satisfies Record<SyncStatus, { label: string; dotClass: string; textClass: string; title: string }>

export default function SyncIndicator({ status, lastSyncedAt }: SyncIndicatorProps) {
  const config = STATUS_CONFIG[status]

  const relativeTime =
    status === 'synced' && lastSyncedAt != null
      ? formatRelativeTime(lastSyncedAt)
      : null

  const titleText =
    relativeTime != null
      ? `${config.title} · ${relativeTime}`
      : config.title

  const label = relativeTime != null ? `Synced ${relativeTime}` : config.label

  return (
    <div
      className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${config.textClass}`}
      title={titleText}
      aria-label={titleText}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClass}`} aria-hidden="true" />
      {label}
    </div>
  )
}

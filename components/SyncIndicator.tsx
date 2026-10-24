'use client'

import { SyncStatus } from '@/hooks/useContracts'

interface SyncIndicatorProps {
  status: SyncStatus
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

export default function SyncIndicator({ status }: SyncIndicatorProps) {
  const config = STATUS_CONFIG[status]

  return (
    <div
      className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${config.textClass}`}
      title={config.title}
      aria-label={config.title}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClass}`} aria-hidden="true" />
      {config.label}
    </div>
  )
}

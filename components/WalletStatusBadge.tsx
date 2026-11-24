'use client'

import { useFreighterStatus, type FreighterStatus } from '@/hooks/useFreighterStatus'

const STATUS_CONFIG: Record<FreighterStatus, { color: string; label: string }> = {
  connected: { color: 'bg-emerald-500', label: 'Connected' },
  disconnected: { color: 'bg-amber-500', label: 'Disconnected' },
  locked: { color: 'bg-red-500', label: 'Locked' },
  'not-allowed': { color: 'bg-amber-500', label: 'Blocked' },
  unavailable: { color: 'bg-zinc-600', label: 'Unavailable' },
  error: { color: 'bg-red-500', label: 'Error' },
}

interface WalletStatusBadgeProps {
  /** Overridable in tests; production uses the standard five-second interval. */
  pollIntervalMs?: number
}

export default function WalletStatusBadge({ pollIntervalMs }: WalletStatusBadgeProps) {
  const { status } = useFreighterStatus(pollIntervalMs)
  const config = STATUS_CONFIG[status]

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800">
      <span
        className={`w-1.5 h-1.5 rounded-full ${config.color}`}
        aria-hidden="true"
        data-testid="wallet-status-dot"
      />
      <span className="text-xs text-zinc-400" role="status" aria-live="polite">
        {config.label}
      </span>
    </div>
  )
}

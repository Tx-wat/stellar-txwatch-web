import { AlertRule } from '@/types'

/**
 * Shared formatting helpers for dates used across the app.
 * For ID truncation use truncateId() from @/lib/stellar.
 *
 * Note: formatDate/formatDateTime here always use the browser's local
 * timezone. Components that need to respect the user's UTC/local toggle
 * should use useTimezone() from @/components/TimezoneProvider instead.
 */

/** Formats a Unix ms timestamp as a locale date string (e.g. "5/29/2026"). */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString()
}

/** Formats a Unix ms timestamp as a locale date+time string. */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

/** Formats a Unix ms timestamp as a relative time string (e.g. "3 days ago", "just now"). */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffMs = now - timestamp
  if (diffMs < 0) return 'just now'
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
  const diffYears = Math.floor(diffDays / 365)
  return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`
}


/** Formats an alert rule as a human-readable summary string. */
export function formatRuleSummary(rule: AlertRule): string {
  switch (rule.type) {
    case 'LargeTransfer':
      return `>= ${rule.threshold_xlm} XLM`
    case 'FunctionCalled':
      return rule.function_name || 'function'
    case 'AdminFunctionCalled':
      return rule.function_names?.join(', ') || 'admin functions'
    default:
      return ''
  }
}

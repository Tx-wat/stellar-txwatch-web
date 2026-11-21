'use client'

import { useState } from 'react'

/**
 * Indicates whether the app is running against a configured backend API
 * or falling back to localStorage-only mode.
 */
export function getApiMode(): { isApiMode: boolean; apiUrl: string | null } {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || null
  return { isApiMode: Boolean(apiUrl), apiUrl }
}

export default function ApiModeBadge() {
  const [showTooltip, setShowTooltip] = useState(false)
  const { isApiMode, apiUrl } = getApiMode()

  return (
    <div className="relative inline-block">
      <span
        tabIndex={isApiMode ? 0 : -1}
        aria-describedby={isApiMode ? 'api-mode-tooltip' : undefined}
        onMouseEnter={() => isApiMode && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => isApiMode && setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          isApiMode
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 cursor-help'
            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isApiMode ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
        {isApiMode ? 'API Connected' : 'Local'}
      </span>
      {isApiMode && showTooltip && (
        <div
          id="api-mode-tooltip"
          role="tooltip"
          className="absolute top-full right-0 mt-2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 whitespace-nowrap z-10 pointer-events-none"
        >
          {apiUrl}
        </div>
      )}
    </div>
  )
}

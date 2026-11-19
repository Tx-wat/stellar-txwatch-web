import Link from 'next/link'
import React, { memo, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WatchedContract } from '@/types'
import NetworkBadge from './NetworkBadge'
import { truncateId } from '@/lib/stellar'
import { formatDate as defaultFormatDate } from '@/lib/format'
import { useTimezone } from './TimezoneProvider'

interface ContractCardProps {
  contract: WatchedContract
  lastAlertTime?: number
  highlight?: boolean
  missing?: boolean
}

function ContractCard({ contract, lastAlertTime, highlight, missing }: ContractCardProps) {
  const router = useRouter()
  const hasWebhook = Boolean(contract.webhook_url)
  const isPaused = (contract as WatchedContract & { enabled?: boolean }).enabled === false
  const [active, setActive] = useState(highlight)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  let formatDate = defaultFormatDate
  let isoString = (ts: number) => new Date(ts).toISOString()
  let mode: 'local' | 'utc' = 'local'
  try {
    const tz = useTimezone()
    formatDate = tz.formatDate
    isoString = tz.isoString
    mode = tz.mode
  } catch {
    // Fallback when rendered outside TimezoneProvider (e.g. in unit tests)
  }

  useEffect(() => {
    if (!highlight) return
    setActive(true)
    const id = setTimeout(() => setActive(false), 2500)
    return () => clearTimeout(id)
  }, [highlight])

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuOpen(true)
  }

  const handleCompare = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    if (router?.push) {
      router.push(`/contracts/compare?a=${encodeURIComponent(contract.id)}`)
    } else if (typeof window !== 'undefined') {
      window.location.href = `/contracts/compare?a=${encodeURIComponent(contract.id)}`
    }
  }

  return (
    <div
      className="relative"
      onContextMenu={handleContextMenu}
      ref={menuRef}
    >
      <Link
        href={`/contracts/${contract.id}`}
        className={`block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group ${
          active ? 'ring-2 ring-indigo-500/40 animate-pulse' : ''
        } ${missing ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-zinc-100 truncate group-hover:text-white">
              {contract.label}
            </h3>
            <p className="text-xs font-mono text-zinc-500 mt-0.5">
              {truncateId(contract.contract_id)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <NetworkBadge network={contract.network} />
              <button
                type="button"
                aria-label="Contract actions"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setMenuOpen((prev: boolean) => !prev)
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                </svg>
              </button>
            </div>
            {missing && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/20">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Not found — network may have been reset</span>
              </span>
            )}
          </div>
        </div>

        {/* Webhook status indicator */}
        {!hasWebhook && (
          <div className="mb-3 flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No webhook configured</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            <span className="text-zinc-300 font-medium">{contract.rules.length}</span>{' '}
            {contract.rules.length === 1 ? 'rule' : 'rules'} {isPaused ? 'paused' : 'active'}
          </span>
          {lastAlertTime ? (
            <span title={isoString(lastAlertTime)}>
              Last alert {formatDate(lastAlertTime)}{mode === 'utc' ? ' UTC' : ''}
            </span>
          ) : (
            <span>No alerts yet</span>
          )}
        </div>
      </Link>

      {menuOpen && (
        <div
          role="menu"
          aria-label="Contract context menu"
          className="absolute right-4 top-12 z-20 w-40 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={handleCompare}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Compare
          </button>
        </div>
      )}
    </div>
  )
}

// Skip re-rendering cards whose contract, alert time and highlight are unchanged
export default memo(ContractCard)

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { WatchedContract, Network } from '@/types'
import { getContracts, deleteContract, saveContract, getTodayAlertCount } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { useContractListState } from '@/hooks/useContractListState'
import { useLastAlertTimes } from '@/hooks/useAlerts'
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import ContractCard from '@/components/ContractCard'
import ContractListToolbar, { DisplayMode } from '@/components/ContractListToolbar'
import BulkActionBar from '@/components/BulkActionBar'
import { exportSelectedContractsAsBlob } from '@/lib/exportStorage'
import EmptyState from '@/components/EmptyState'
import NetworkBadge from '@/components/NetworkBadge'

const NETWORK_LABELS: Record<Network, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  futurenet: 'Futurenet',
}

const VALID_NETWORKS: Network[] = ['mainnet', 'testnet', 'futurenet']

const UNGROUPED_KEY = '__ungrouped__'
const UNGROUPED_LABEL = 'Ungrouped'

interface CsvRowError {
  line: number
  message: string
}

interface CsvImportResult {
  imported: number
  skipped: number
  errors: CsvRowError[]
}

function isValidWebhookUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells.map((cell) => cell.trim())
}

function importContractsFromCsv(text: string): CsvImportResult {
  const errors: CsvRowError[] = []
  let imported = 0
  let skipped = 0

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    return { imported: 0, skipped: 0, errors: [{ line: 0, message: 'CSV file is empty' }] }
  }

  const header = parseCsvLine(lines[0]).map((cell) => cell.toLowerCase())
  const expected = ['contract_id', 'label', 'network', 'webhook_url']
  const hasHeader = header.includes('contract_id')
  const dataLines = hasHeader ? lines.slice(1) : lines
  const startLine = hasHeader ? 2 : 1

  if (hasHeader) {
    const missing = expected.filter((col) => !header.includes(col))
    if (missing.length > 0) {
      return {
        imported: 0,
        skipped: 0,
        errors: [{ line: 1, message: `Missing column(s): ${missing.join(', ')}` }],
      }
    }
  }

  const colIndex = (name: string) => (hasHeader ? header.indexOf(name) : expected.indexOf(name))

  dataLines.forEach((line, idx) => {
    const lineNumber = startLine + idx
    const cells = parseCsvLine(line)
    const contractId = cells[colIndex('contract_id')] ?? ''
    const label = cells[colIndex('label')] ?? ''
    const network = (cells[colIndex('network')] ?? '').toLowerCase()
    const webhookUrl = cells[colIndex('webhook_url')] ?? ''

    const rowErrors: string[] = []
    if (!contractId) rowErrors.push('contract_id is required')
    if (!network) {
      rowErrors.push('network is required')
    } else if (!VALID_NETWORKS.includes(network as Network)) {
      rowErrors.push(`invalid network "${network}"`)
    }
    if (!isValidWebhookUrl(webhookUrl)) {
      rowErrors.push('invalid webhook_url')
    }

    if (rowErrors.length > 0) {
      skipped++
      errors.push({ line: lineNumber, message: rowErrors.join('; ') })
      return
    }

    const now = Date.now()
    saveContract({
      id: crypto.randomUUID(),
      contract_id: contractId,
      label: label || contractId,
      network: network as Network,
      rules: [],
      webhook_url: webhookUrl,
      created_at: now,
      updated_at: now,
    })
    imported++
  })

  return { imported, skipped, errors }
}

const CONTRACT_CARD_SELECTOR = '[data-contract-card="true"]'

export function handleContractGridKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  router: ReturnType<typeof useRouter>,
  toggleSelected: (id: string) => void
) {
  const target = event.target as HTMLElement
  const card = target.closest(CONTRACT_CARD_SELECTOR) as HTMLElement | null
  if (!card) return

  const cards = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(CONTRACT_CARD_SELECTOR)
  )
  const index = cards.indexOf(card)
  if (index === -1) return

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown': {
      event.preventDefault()
      const next = cards[index + 1]
      next?.focus()
      break
    }
    case 'ArrowLeft':
    case 'ArrowUp': {
      event.preventDefault()
      const prev = cards[index - 1]
      prev?.focus()
      break
    }
    case 'Enter': {
      event.preventDefault()
      const id = card.dataset.contractId
      if (id) router.push(`/contracts/${id}`)
      break
    }
    case ' ': {
      event.preventDefault()
      const id = card.dataset.contractId
      if (id) toggleSelected(id)
      break
    }
    default:
      break
  }
}

export default function ContractsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allContracts, setAllContracts] = useState<WatchedContract[]>([])
  const [mounted, setMounted] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastAlertTimes = useLastAlertTimes()
  const list = useContractListState(allContracts, searchParams?.get('q') ?? '')
  const { recentIds } = useRecentlyViewed()
  const [infiniteScrollEnabled, setInfiniteScrollEnabled] = useState(false)
  const { sentinelRef, visibleCount, hasMore, reset: resetScroll } = useInfiniteScroll({
    total: list.sorted.length,
    pageSize: 12,
    enabled: infiniteScrollEnabled && list.viewMode === 'flat',
  })

  const contractGroups = useMemo(() => {
    const groups = new Map<string, WatchedContract[]>()
    for (const contract of list.filtered) {
      const key = contract.group?.trim() ? contract.group.trim() : UNGROUPED_KEY
      const existing = groups.get(key)
      if (existing) {
        existing.push(contract)
      } else {
        groups.set(key, [contract])
      }
    }
    return Array.from(groups.entries())
      .map(([key, contracts]) => ({
        key,
        label: key === UNGROUPED_KEY ? UNGROUPED_LABEL : key,
        contracts,
      }))
      .sort((a, b) => {
        if (a.key === UNGROUPED_KEY) return 1
        if (b.key === UNGROUPED_KEY) return -1
        return a.label.localeCompare(b.label)
      })
  }, [list.filtered])

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    document.title = 'Contracts · TxWatch'
    setAllContracts(getContracts())
    const stored = localStorage.getItem(STORAGE_KEYS.CONTRACT_DISPLAY_MODE)
    if (stored === 'list' || stored === 'grid') {
      setDisplayMode(stored)
    }
    setMounted(true)
  }, [])

  // Reset infinite scroll when the filtered/sorted dataset changes
  useEffect(() => {
    resetScroll()
  }, [list.search, list.networkFilter, list.sortBy, resetScroll])

  // Check for a recently-created contract id in sessionStorage and highlight it once
  useEffect(() => {
    try {
      const id = sessionStorage.getItem(STORAGE_KEYS.LAST_CREATED_CONTRACT)
      if (id) {
        setHighlightedId(id)
        sessionStorage.removeItem(STORAGE_KEYS.LAST_CREATED_CONTRACT)
        const t = setTimeout(() => setHighlightedId(null), 6000)
        return () => clearTimeout(t)
      }
    } catch {
      // ignore (server-side or storage issues)
    }
  }, [])

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode)
    try {
      localStorage.setItem(STORAGE_KEYS.CONTRACT_DISPLAY_MODE, mode)
    } catch {
      // ignore storage errors
    }
  }

  const handleDeleteSelected = () => {
    for (const id of list.selectedIds) {
      deleteContract(id)
    }
    list.clearSelection()
    setAllContracts(getContracts())
  }

  // Downloads only the selected contracts, in the same format as the full export (#653)
  const handleExportSelected = () => {
    const url = URL.createObjectURL(exportSelectedContractsAsBlob(list.selectedIds))
    const link = document.createElement('a')
    link.href = url
    link.download = 'txwatch-selected-contracts.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const text = await file.text()
    setImportResult(importContractsFromCsv(text))
    setAllContracts(getContracts())
  }

  if (!mounted) return null

  const hasAnyContracts = allContracts.length > 0
  // Totals for the footer (#648). Alert count is read on render, so it refreshes with the page.
  const totalRules = allContracts.reduce((sum, contract) => sum + contract.rules.length, 0)
  const todayAlertCount = getTodayAlertCount()
  const hasFilteredContracts = list.filtered.length > 0

  const renderCard = (contract: WatchedContract) => {
    const selected = list.selectedIds.includes(contract.id)
    if (displayMode === 'list') {
      return (
        <div key={contract.id} className="relative flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => list.toggleSelected(contract.id)}
            aria-label={`Select ${contract.label}`}
            className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-600 shrink-0"
          />
          <Link
            href={`/contracts/${contract.id}`}
            className="flex-1 min-w-0 flex items-center gap-3 hover:text-indigo-400 transition-colors"
          >
            <span className="font-medium text-sm text-zinc-100 truncate">{contract.label}</span>
            <span className="text-xs text-zinc-500 font-mono truncate hidden sm:block">
              {contract.contract_id.slice(0, 8)}…{contract.contract_id.slice(-8)}
            </span>
            <span className="ml-auto shrink-0">
              <NetworkBadge network={contract.network} />
            </span>
          </Link>
        </div>
      )
    }
    return (
      <div
        key={contract.id}
        className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-xl"
        data-contract-card="true"
        data-contract-id={contract.id}
        tabIndex={0}
        aria-label={`${contract.label} contract card. Use arrow keys to navigate, Enter to open, Space to select.`}
      >
        <ContractCard
          contract={contract}
          lastAlertTime={lastAlertTimes[contract.contract_id]}
          highlight={highlightedId === contract.id}
        />
        <input
          type="checkbox"
          checked={selected}
          onChange={() => list.toggleSelected(contract.id)}
          aria-label={`Select ${contract.label}`}
          className="absolute bottom-3 right-3 h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-600"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ContractListToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        networkFilters={list.networkFilters}
        onNetworkFilterToggle={list.toggleNetworkFilter}
        networkCounts={list.networkCounts}
        sortBy={list.sortBy}
        onSortChange={list.setSortBy}
        viewMode={list.viewMode}
        onViewModeChange={list.setViewMode}
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
        hasAnyContracts={hasAnyContracts}
        resultCount={list.filtered.length}
        allVisibleSelected={list.allVisibleSelected}
        onToggleSelectAll={list.toggleSelectAllVisible}
      />

      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCsvFile}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Import CSV
        </button>
      </div>

      {importResult && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium text-zinc-100">
              {importResult.imported} contracts imported, {importResult.skipped} skipped
            </p>
            <button
              type="button"
              onClick={() => setImportResult(null)}
              className="text-zinc-500 hover:text-zinc-300"
              aria-label="Dismiss import summary"
            >
              ✕
            </button>
          </div>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-red-400">
              {importResult.errors.map((err, i) => (
                <li key={i}>
                  {err.line > 0 ? `Line ${err.line}: ` : ''}
                  {err.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasFilteredContracts && (
        <BulkActionBar
          selectedCount={list.selectedIds.length}
          allVisibleSelected={list.allVisibleSelected}
          onToggleSelectAll={list.toggleSelectAllVisible}
          onExportSelected={handleExportSelected}
          onClearSelection={list.clearSelection}
          onDeleteSelected={handleDeleteSelected}
        />
      )}

      {/* Recently Viewed section — shown when there are contracts and the user
          has visited at least one detail page this session */}
      {hasAnyContracts && recentIds.length > 0 && !list.search && list.networkFilter === 'all' && (() => {
        const recentContracts = recentIds
          .map((id) => allContracts.find((c) => c.id === id))
          .filter((c): c is WatchedContract => c !== undefined)
        if (recentContracts.length === 0) return null
        return (
          <section aria-label="Recently viewed contracts">
            <h2 className="text-sm font-medium text-zinc-500 mb-3 flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recently Viewed
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  lastAlertTime={lastAlertTimes[contract.contract_id]}
                />
              ))}
            </div>
          </section>
        )
      })()}

      {!hasAnyContracts ? (
        <EmptyState
          title="No contracts yet"
          description="Add a contract to start monitoring its activity, or import a CSV to register many at once."
          action={
            <Link
              href="/contracts/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
            >
              Add Contract
            </Link>
          }
        />
      ) : !hasFilteredContracts ? (
        <EmptyState
          title={search.trim() ? 'No contracts match your search' : 'No contracts found'}
          description={
            search.trim()
              ? `No contracts match "${search.trim()}" with the current network filter. Clear the search to see more.`
              : 'No contracts match the active network filter. Try selecting a different network.'
          }
          action={
            <button
              onClick={list.clearFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
            >
              Clear Filters
            </button>
          }
        />
      ) : list.viewMode === 'grouped' ? (
        <div className="space-y-8">
          {(Object.entries(NETWORK_LABELS) as [Network, string][]).map(([network, label]) => {
            const networkContracts = list.grouped[network]
            if (networkContracts.length === 0) return null
            return (
              <section key={network}>
                <h2 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  {label}
                  <span className="text-sm font-normal text-zinc-500">({networkContracts.length})</span>
                </h2>
                <div
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  onKeyDown={(e) => handleContractGridKeyDown(e, router, list.toggleSelected)}
                >
                  {networkContracts.map(renderCard)}
                </div>
              </section>
            )
          })}
        </div>
      ) : contractGroups.length > 0 && contractGroups.some((g) => g.key !== UNGROUPED_KEY) ? (
        <div className="space-y-8">
          {contractGroups.map((group) => {
            const collapsed = !!collapsedGroups[group.key]
            return (
              <section key={group.key}>
                <h2 className="text-lg font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={!collapsed}
                    aria-controls={`group-section-${group.key}`}
                    className="flex items-center gap-2 text-left hover:text-zinc-100"
                  >
                    <span
                      aria-hidden="true"
                      className={`inline-block transition-transform ${collapsed ? '-rotate-90' : ''}`}
                    >
                      ▾
                    </span>
                    {group.label}
                    <span className="text-sm font-normal text-zinc-500">({group.contracts.length})</span>
                  </button>
                </h2>
                {!collapsed && (
                  <div
                    id={`group-section-${group.key}`}
                    className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    onKeyDown={(e) => handleContractGridKeyDown(e, router, list.toggleSelected)}
                  >
                    {group.contracts.map(renderCard)}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
            onKeyDown={(e) => handleContractGridKeyDown(e, router, list.toggleSelected)}
          >
            {list.paginated.map(renderCard)}
          </div>

          {infiniteScrollEnabled ? (
            <>
              {hasMore && (
                <div ref={sentinelRef} className="flex justify-center py-6">
                  <span className="inline-flex items-center gap-2 text-sm text-zinc-500">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Loading more…
                  </span>
                </div>
              )}
              {!hasMore && list.sorted.length > 12 && (
                <p className="text-center text-xs text-zinc-600 py-4">
                  All {list.sorted.length} contracts loaded
                </p>
              )}
              {/* Off-screen sentinel so the observer still fires even when spinner is not visible */}
              {!hasMore && <div ref={sentinelRef} aria-hidden="true" />}
            </>
          ) : (
            list.totalPages > 1 && (
              <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
                <span>Page {list.page} of {list.totalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => list.setPage(list.page - 1)}
                    disabled={list.page === 1}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => list.setPage(Math.min(list.totalPages, list.page + 1))}
                    disabled={list.page === list.totalPages}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )
          )}
        </>
      )}

      {hasAnyContracts && (
        <footer className="flex flex-wrap gap-x-6 gap-y-1 border-t border-zinc-800 pt-4 text-sm text-zinc-400">
          <span>{allContracts.length} {allContracts.length === 1 ? 'contract' : 'contracts'}</span>
          <span>{totalRules} {totalRules === 1 ? 'rule' : 'rules'}</span>
          <span>{todayAlertCount} {todayAlertCount === 1 ? 'alert' : 'alerts'} today</span>
        </footer>
      )}
    </div>
  )
}

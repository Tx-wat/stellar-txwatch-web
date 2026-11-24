'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { WatchedContract, Network } from '@/types'
import { getContracts, deleteContract } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { importContractsFromCsv, type CsvImportResult } from '@/lib/contractCsv'
import { useContractListState } from '@/hooks/useContractListState'
import { useLastAlertTimes } from '@/hooks/useAlerts'
import ContractCard from '@/components/ContractCard'
import ContractListToolbar from '@/components/ContractListToolbar'
import BulkActionBar from '@/components/BulkActionBar'
import EmptyState from '@/components/EmptyState'

const NETWORK_LABELS: Record<Network, string> = {
  mainnet: 'Mainnet',
  testnet: 'Testnet',
  futurenet: 'Futurenet',
}

const UNGROUPED_KEY = '__ungrouped__'
const UNGROUPED_LABEL = 'Ungrouped'

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastAlertTimes = useLastAlertTimes()
  const list = useContractListState(allContracts, searchParams?.get('q') ?? '')

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
    setMounted(true)
  }, [])

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

  const handleDeleteSelected = () => {
    for (const id of list.selectedIds) {
      deleteContract(id)
    }
    list.clearSelection()
    setAllContracts(getContracts())
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
  const hasFilteredContracts = list.filtered.length > 0

  const renderCard = (contract: WatchedContract) => {
    const selected = list.selectedIds.includes(contract.id)
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
        networkFilter={list.networkFilter}
        onNetworkFilterChange={list.setNetworkFilter}
        networkCounts={list.networkCounts}
        sortBy={list.sortBy}
        onSortChange={list.setSortBy}
        viewMode={list.viewMode}
        onViewModeChange={list.setViewMode}
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
          onClearSelection={list.clearSelection}
          onDeleteSelected={handleDeleteSelected}
        />
      )}

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
          description="No contracts match the active search or network filter. Try clearing the search or selecting a different network."
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

          {list.totalPages > 1 && (
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
          )}
        </>
      )}
    </div>
  )
}

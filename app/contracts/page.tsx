'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { WatchedContract, Network } from '@/types'
import { getContracts, deleteContract, saveContract } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storageKeys'
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

const VALID_NETWORKS: Network[] = ['mainnet', 'testnet', 'futurenet']

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

export default function ContractsPage() {
  const searchParams = useSearchParams()
  const [allContracts, setAllContracts] = useState<WatchedContract[]>([])
  const [mounted, setMounted] = useState(false)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastAlertTimes = useLastAlertTimes()
  const list = useContractListState(allContracts, searchParams?.get('q') ?? '')

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
      <div key={contract.id} className="relative">
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
          title="No contracts found"
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
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {networkContracts.map(renderCard)}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

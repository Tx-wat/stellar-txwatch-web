import { Network, WatchedContract } from '@/types'
import { isValidContractId } from '@/lib/stellar'
import { getContracts, saveContract } from '@/lib/storage'

/**
 * Shared CSV contract-import implementation used by both the Contracts list
 * page (`/contracts`) and the Add Contract page (`/contracts/new`).
 *
 * Even though the two pages are written defensively, a shared implementation
 * means the parsing and — importantly — duplicate detection can only ever
 * behave one way.
 */

/** Column order used when the CSV has no header row. */
export const CSV_COLUMNS = ['contract_id', 'label', 'network', 'webhook_url'] as const

export const VALID_NETWORKS: Network[] = ['mainnet', 'testnet', 'futurenet']

/** Maximum label length, matching the add-contract form. */
export const MAX_LABEL_LENGTH = 100

export interface CsvRowError {
  /** 1-based line number in the uploaded file; 0 for whole-file errors. */
  line: number
  message: string
}

export interface CsvImportResult {
  imported: number
  skipped: number
  errors: CsvRowError[]
}

/** Parses a single CSV line, supporting quoted cells and escaped quotes. */
export function parseCsvLine(line: string): string[] {
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

function isValidWebhookUrl(value: string): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** Identity of a watched contract: the same contract may exist on several networks. */
export function contractKey(contractId: string, network: string): string {
  return `${contractId}:${network}`
}

/**
 * Parses CSV text and saves every valid, not-yet-registered row.
 *
 * A row is skipped (never silently duplicated) when its `contract_id:network`
 * pair already exists in storage or was imported earlier in the same file.
 *
 * @param text Raw CSV contents.
 * @param existing Contracts already registered; defaults to the current store.
 * @returns Counts plus one error entry per skipped row.
 */
export function importContractsFromCsv(
  text: string,
  existing: WatchedContract[] = getContracts()
): CsvImportResult {
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
  const hasHeader = header.includes('contract_id')
  const dataLines = hasHeader ? lines.slice(1) : lines
  const startLine = hasHeader ? 2 : 1

  if (hasHeader) {
    const missing = CSV_COLUMNS.filter((column) => !header.includes(column))
    if (missing.length > 0) {
      return {
        imported: 0,
        skipped: 0,
        errors: [{ line: 1, message: `Missing column(s): ${missing.join(', ')}` }],
      }
    }
  }

  const colIndex = (name: string) =>
    hasHeader ? header.indexOf(name) : CSV_COLUMNS.indexOf(name as (typeof CSV_COLUMNS)[number])

  const seen = new Set(existing.map((c) => contractKey(c.contract_id, c.network)))

  dataLines.forEach((line, idx) => {
    const lineNumber = startLine + idx
    const cells = parseCsvLine(line)
    const get = (column: string) => cells[colIndex(column)] ?? ''

    const contractId = get('contract_id')
    const label = get('label')
    const network = get('network').toLowerCase()
    const webhookUrl = get('webhook_url')

    const rowIssues: string[] = []
    if (!contractId) {
      rowIssues.push('contract_id is required')
    } else if (!isValidContractId(contractId)) {
      rowIssues.push('invalid contract_id')
    }
    if (!label) {
      rowIssues.push('label is required')
    } else if (label.length > MAX_LABEL_LENGTH) {
      rowIssues.push(`label must be ${MAX_LABEL_LENGTH} characters or less`)
    }
    if (!network) {
      rowIssues.push('network is required')
    } else if (!VALID_NETWORKS.includes(network as Network)) {
      rowIssues.push(`invalid network "${network}"`)
    }
    if (!webhookUrl) {
      rowIssues.push('webhook_url is required')
    } else if (!isValidWebhookUrl(webhookUrl)) {
      rowIssues.push('invalid webhook_url')
    }

    if (rowIssues.length === 0) {
      const key = contractKey(contractId, network)
      if (seen.has(key)) {
        rowIssues.push('duplicate contract already registered')
      }
    }

    if (rowIssues.length > 0) {
      skipped++
      errors.push({ line: lineNumber, message: rowIssues.join('; ') })
      return
    }

    const now = Date.now()
    saveContract({
      id: crypto.randomUUID(),
      label,
      contract_id: contractId,
      network: network as Network,
      rules: [],
      webhook_url: webhookUrl,
      created_at: now,
      updated_at: now,
    })
    seen.add(contractKey(contractId, network))
    imported++
  })

  return { imported, skipped, errors }
}

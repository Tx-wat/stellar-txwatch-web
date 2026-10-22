import type { WatchedContract } from '@/types'

/** The snapshot file format version. Increment when the schema changes. */
const SNAPSHOT_VERSION = 1 as const

export interface StoredContractExport {
  id: string;
  address: string;
  label: string;
  network: string;
  notes?: string;
  [key: string]: unknown;
}

const MAX_NOTES_LENGTH = 1000;

function normalizeNotes(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_NOTES_LENGTH);
}

function normalizeContract(contract: StoredContractExport): StoredContractExport {
  const normalized: StoredContractExport = { ...contract };
  const notes = normalizeNotes(contract.notes);
  if (notes === undefined) {
    delete normalized.notes;
  } else {
    normalized.notes = notes;
  }
  return normalized;
}

function readContractsFromStorage(storageKey: string): StoredContractExport[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    return JSON.parse(raw) as WatchedContract[]
  } catch {
    console.warn(`[exportStorage] Could not read key "${storageKey}" from localStorage`)
    return []
  }
}

export function buildContractSnapshot(
  storageKey = CONTRACTS_STORAGE_KEY,
): ContractExportSnapshot {
  const contracts = readContractsFromStorage(storageKey).map(normalizeContract);
  return {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    count: contracts.length,
    contracts,
  }
}

export function exportContractsAsJson(storageKey?: string): string {
  return JSON.stringify(buildContractSnapshot(storageKey), null, 2)
}

export function exportContractsAsBlob(storageKey?: string): Blob {
  return new Blob([exportContractsAsJson(storageKey)], { type: 'application/json' })
}

/**
 * Validates and parses a JSON string that was previously exported via
 * `exportContractsAsJson`. Throws a descriptive error on invalid input.
 */
export function parseContractSnapshot(json: string): ContractExportSnapshot {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('Invalid JSON: cannot parse contract snapshot')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as ContractExportSnapshot).version !== SNAPSHOT_VERSION ||
    !Array.isArray((parsed as ContractExportSnapshot).contracts)
  ) {
    throw new Error(
      'Invalid snapshot format: expected { version: 1, contracts: [...] }',
    )
  }

  const snapshot = parsed as ContractExportSnapshot;
  return {
    ...snapshot,
    contracts: snapshot.contracts.map(normalizeContract),
  };
}

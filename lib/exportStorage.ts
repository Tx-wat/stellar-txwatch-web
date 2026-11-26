import type { WatchedContract } from '@/types'
import { STORAGE_KEYS } from '@/lib/storageKeys';

/** The snapshot file format version. Increment when the schema changes. */
const SNAPSHOT_VERSION = 1 as const

export interface ContractExportSnapshot {
  version: typeof SNAPSHOT_VERSION;
  exportedAt: string;
  count: number;
  contracts: StoredContractExport[];
}

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
  storageKey: string = STORAGE_KEYS.CONTRACTS,
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

/** Same snapshot format as `buildContractSnapshot`, limited to the given contract IDs (#653). */
export function buildSelectedContractSnapshot(
  ids: string[],
  storageKey: string = STORAGE_KEYS.CONTRACTS,
): ContractExportSnapshot {
  const wanted = new Set(ids)
  const contracts = readContractsFromStorage(storageKey)
    .filter((contract) => wanted.has(contract.id))
    .map(normalizeContract)
  return {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    count: contracts.length,
    contracts,
  }
}

export function exportSelectedContractsAsBlob(ids: string[], storageKey?: string): Blob {
  const json = JSON.stringify(buildSelectedContractSnapshot(ids, storageKey), null, 2)
  return new Blob([json], { type: 'application/json' })
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

/** Encrypted export envelope — the file format produced when a password is supplied. */
export interface EncryptedExportEnvelope {
  encrypted: true;
  version: typeof SNAPSHOT_VERSION;
  salt: string; // base64
  iv: string; // base64
  ciphertext: string; // base64
}

const PBKDF2_ITERATIONS = 100_000;

function bufToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function base64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypts a contract snapshot with a password using AES-GCM, keyed via
 * PBKDF2. Returns a JSON string of the encrypted envelope, suitable for
 * writing to a file for sharing.
 */
export async function exportContractsEncrypted(
  password: string,
  storageKey?: string,
): Promise<string> {
  const json = exportContractsAsJson(storageKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(json),
  );
  const envelope: EncryptedExportEnvelope = {
    encrypted: true,
    version: SNAPSHOT_VERSION,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    ciphertext: bufToBase64(ciphertext),
  };
  return JSON.stringify(envelope, null, 2);
}

/** Returns true if the given parsed JSON looks like an encrypted export envelope. */
export function isEncryptedExport(value: unknown): value is EncryptedExportEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as EncryptedExportEnvelope).encrypted === true &&
    typeof (value as EncryptedExportEnvelope).salt === 'string' &&
    typeof (value as EncryptedExportEnvelope).iv === 'string' &&
    typeof (value as EncryptedExportEnvelope).ciphertext === 'string'
  );
}

/**
 * Decrypts an encrypted export envelope (as produced by
 * `exportContractsEncrypted`) back into a validated snapshot. Throws if the
 * password is wrong or the data is corrupt.
 */
export async function decryptContractSnapshot(
  json: string,
  password: string,
): Promise<ContractExportSnapshot> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: cannot parse encrypted export');
  }
  if (!isEncryptedExport(parsed)) {
    throw new Error('Invalid encrypted export format');
  }
  const salt = new Uint8Array(base64ToBuf(parsed.salt));
  const iv = new Uint8Array(base64ToBuf(parsed.iv));
  const key = await deriveKey(password, salt);
  let plaintextBuf: ArrayBuffer;
  try {
    plaintextBuf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      base64ToBuf(parsed.ciphertext),
    );
  } catch {
    throw new Error('Incorrect password or corrupted export file');
  }
  const plaintext = new TextDecoder().decode(plaintextBuf);
  return parseContractSnapshot(plaintext);
}

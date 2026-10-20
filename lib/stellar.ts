import { Network } from '@/types'

/** Horizon REST API endpoints keyed by network. */
export const HORIZON_URLS: Record<Network, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
  futurenet: 'https://horizon-futurenet.stellar.org',
}

/** Soroban RPC endpoints keyed by network. */
export const SOROBAN_RPC_URLS: Record<Network, string> = {
  mainnet: 'https://mainnet.stellar.validationcloud.io/v1/soroban/rpc',
  testnet: 'https://soroban-testnet.stellar.org',
  futurenet: 'https://rpc-futurenet.stellar.org',
}

/** Base URL for the Stellar Expert block explorer. */
export const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer'

/**
 * Build a Stellar Expert URL for a transaction.
 *
 * @param network - Network the transaction was submitted on. `mainnet` is
 *   mapped to the explorer's `public` path segment.
 * @param txHash - Transaction hash (hex string).
 * @returns Absolute URL to the transaction on Stellar Expert.
 */
export function explorerTxUrl(network: Network, txHash: string): string {
  const net = network === 'mainnet' ? 'public' : network
  return `${STELLAR_EXPERT_BASE}/${net}/tx/${txHash}`
}

/**
 * Build a Stellar Expert URL for a contract.
 *
 * @param network - Network the contract lives on. `mainnet` is mapped to the
 *   explorer's `public` path segment.
 * @param contractId - Contract identifier (`C...`).
 * @returns Absolute URL to the contract on Stellar Expert.
 */
export function explorerContractUrl(network: Network, contractId: string): string {
  const net = network === 'mainnet' ? 'public' : network
  return `${STELLAR_EXPERT_BASE}/${net}/contract/${contractId}`
}

/**
 * Abbreviate a long identifier for display.
 *
 * @param id - Full identifier string.
 * @param chars - Number of leading/trailing characters to keep (default `8`).
 * @returns The identifier unchanged when short enough, otherwise
 *   `${first}...${last}`.
 */
export function truncateId(id: string, chars = 8): string {
  if (id.length <= chars * 2 + 3) return id
  return `${id.slice(0, chars)}...${id.slice(-chars)}`
}

/**
 * Validate a Soroban contract identifier.
 *
 * @param id - Candidate contract identifier.
 * @returns `true` for a 56-character `C` + base32 (A-Z, 2-7) address.
 * @example
 *   isValidContractId('CCJZ5D3C...'); // true (valid C-address)
 *   isValidContractId('GABC...'); // false (G-address)
 *   isValidContractId('cabc...'); // false (lowercase invalid)
 */
export function isValidContractId(id: string): boolean {
  return /^C[A-Z2-7]{55}$/.test(id)
}

/**
 * Check whether a string is a valid http/https URL.
 *
 * @param url - Candidate URL string.
 * @returns `true` only for `http:`/`https:` URLs; `ftp`, empty and malformed
 *   inputs return `false`.
 */
export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

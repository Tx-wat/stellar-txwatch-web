import { StrKey } from '@stellar/stellar-sdk'
import { Network } from '@/types'
import { StrKey } from '@stellar/stellar-sdk'
import { SorobanRpc, Horizon, contract } from '@stellar/stellar-sdk'

const DEFAULT_HORIZON_URLS: Record<Network, string> = {
  mainnet: 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org',
  futurenet: 'https://horizon-futurenet.stellar.org',
}

const mainnetRpcUrl =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL_MAINNET ||
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  'https://mainnet.sorobanrpc.com'

if (
  typeof window !== 'undefined' &&
  !process.env.NEXT_PUBLIC_SOROBAN_RPC_URL_MAINNET &&
  !process.env.NEXT_PUBLIC_SOROBAN_RPC_URL
) {
  console.warn(
    '[stellar-txwatch-web] Warning: NEXT_PUBLIC_SOROBAN_RPC_URL_MAINNET is unset. Falling back to keyless public provider https://mainnet.sorobanrpc.com.',
  )
}

export const SOROBAN_RPC_URLS: Record<Network, string> = {
  mainnet: mainnetRpcUrl,
  testnet: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL_TESTNET || 'https://soroban-testnet.stellar.org',
  futurenet: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL_FUTURENET || 'https://rpc-futurenet.stellar.org',
}

export function getSorobanRpcUrl(network: Network): string {
  return SOROBAN_RPC_URLS[network]
}


export const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer'

export type ExplorerId = 'stellar-expert' | 'stellar-chain' | 'horizon'

export interface ExplorerMeta {
  id: ExplorerId
  name: string
  description: string
}

export const EXPLORERS: ExplorerMeta[] = [
  {
    id: 'stellar-expert',
    name: 'Stellar Expert',
    description: 'Rich explorer with contract and transaction details.',
  },
  {
    id: 'stellar-chain',
    name: 'StellarChain',
    description: 'Alternative block explorer for the Stellar network.',
  },
  {
    id: 'horizon',
    name: 'Horizon (raw JSON)',
    description: 'View the raw Horizon API response for the transaction.',
  },
]

export const DEFAULT_EXPLORER: ExplorerId = 'stellar-expert'

export function isExplorerId(value: unknown): value is ExplorerId {
  return (
    value === 'stellar-expert' ||
    value === 'stellar-chain' ||
    value === 'horizon'
  )
}

function stellarExpertNet(network: Network): string {
  return network === 'mainnet' ? 'public' : network
}

function stellarChainNet(network: Network): string {
  return network === 'mainnet' ? 'public' : network
}

export function explorerTxUrl(
  network: Network,
  txHash: string,
  explorer: ExplorerId = DEFAULT_EXPLORER,
): string {
  switch (explorer) {
    case 'stellar-chain':
      return `https://stellarchain.io/${stellarChainNet(network)}/tx/${txHash}`
    case 'horizon':
      return `${HORIZON_URLS[network]}/transactions/${txHash}`
    case 'stellar-expert':
    default:
      return `${STELLAR_EXPERT_BASE}/${stellarExpertNet(network)}/tx/${txHash}`
  }
}

export function explorerContractUrl(
  network: Network,
  contractId: string,
  explorer: ExplorerId = DEFAULT_EXPLORER,
): string {
  switch (explorer) {
    case 'stellar-chain':
      return `https://stellarchain.io/${stellarChainNet(network)}/contracts/${contractId}`
    case 'horizon':
      // Horizon does not expose contracts directly; fall back to the account
      // endpoint which returns the raw JSON for the contract's account.
      return `${HORIZON_URLS[network]}/accounts/${contractId}`
    case 'stellar-expert':
    default:
      return `${STELLAR_EXPERT_BASE}/${stellarExpertNet(network)}/contract/${contractId}`
  }
}

export function truncateId(id: string, chars = 8): string {
  if (id.length <= chars * 2 + 3) return id
  return `${id.slice(0, chars)}...${id.slice(-chars)}`
}

export function isValidContractId(id: string): boolean {
  try {
    return StrKey.isValidContract(id)
  } catch {
    return false
  }
}

export function isValidAccountId(id: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(id)
  } catch {
    return false
  }
}

export type ContractIdValidationResult =
  | { valid: true }
  | { valid: false; reason: 'format' | 'checksum'; message: string }

/**
 * Validate a Stellar contract ID (StrKey `C...`).
 *
 * Distinguishes between a malformed ID (wrong prefix, length or alphabet) and
 * a well-formed ID whose CRC16 checksum does not verify (e.g. a one-character
 * typo).
 */
export function validateContractId(id: string): ContractIdValidationResult {
  if (typeof id !== 'string' || !CONTRACT_ID_FORMAT.test(id)) {
    return {
      valid: false,
      reason: 'format',
      message:
        'Invalid contract ID format: expected a 56-character string starting with "C" using the base32 alphabet (A-Z, 2-7).',
    }
  }
}
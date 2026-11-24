import {
  DEFAULT_EXPLORER,
  HORIZON_URLS,
  STELLAR_EXPERT_BASE,
  STELLARCHAIN_BASE,
} from '@/lib/stellar'
import type { ExplorerId, Network } from '@/types'

/** Human-readable name used in link labels and menus. */
export function getExplorerName(explorer: ExplorerId = DEFAULT_EXPLORER): string {
  switch (explorer) {
    case 'stellarchain':
      return 'StellarChain'
    case 'horizon':
      return 'Horizon'
    default:
      return 'Stellar Expert'
  }
}

/**
 * Builds a transaction link for the selected explorer. Webhook entries do not
 * carry a network, so mainnet (the `public` segment) is the default.
 */
export function explorerTxUrl(
  txHash: string,
  explorer: ExplorerId = DEFAULT_EXPLORER,
  network: Network = 'mainnet'
): string {
  const segment = network === 'mainnet' ? 'public' : network
  switch (explorer) {
    case 'stellarchain':
      return `${STELLARCHAIN_BASE}/${segment}/tx/${txHash}`
    case 'horizon':
      return `${HORIZON_URLS[network]}/transactions/${txHash}`
    default:
      return `${STELLAR_EXPERT_BASE}/${segment}/tx/${txHash}`
  }
}

import { Network } from '@/types'

const styles: Record<Network, string> = {
  mainnet: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  testnet: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  futurenet: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export default function NetworkBadge({ network }: { network: Network }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[network]}`}>
      {network.charAt(0).toUpperCase() + network.slice(1)}
    </span>
  )
}

export interface StoredContract {
  id: string;
  address: string;
  label: string;
  network: string;
  [key: string]: unknown;
}

const NETWORK_ORDER: Record<string, number> = {
  mainnet: 0,
  testnet: 1,
  futurenet: 2,
};

function networkRank(network: string): number {
  return NETWORK_ORDER[network.toLowerCase()] ?? 99;
}

export function sortByLastAlert<T extends StoredContract & { contract_id: string; created_at: number }>(
  contracts: T[],
  getLastAlertTime: (contractId: string) => number | undefined
): T[] {
  return [...contracts].sort((a, b) => {
    const aTime = getLastAlertTime(a.contract_id) ?? 0
    const bTime = getLastAlertTime(b.contract_id) ?? 0
    if (bTime !== aTime) return bTime - aTime
    return b.created_at - a.created_at
  })
}

export function sortContracts<T extends StoredContract>(contracts: T[]): T[] {
  return [...contracts].sort((a, b) => {
    const netDiff = networkRank(a.network) - networkRank(b.network);
    if (netDiff !== 0) return netDiff;

    const labelDiff = a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    if (labelDiff !== 0) return labelDiff;

    return a.id.localeCompare(b.id);
  });
}

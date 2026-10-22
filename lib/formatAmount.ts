export type KnownAsset = 'XLM' | 'USDC' | 'native';

const ASSET_DECIMALS: Record<string, number> = {
  XLM:    7,
  USDC:   2,
  native: 7,
};

const DEFAULT_DECIMALS = 7;

export function formatAmount(
  raw: string | number,
  asset: string = 'XLM',
  stroops = false,
  decimals?: number,
): string {
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!isFinite(num)) return `— ${asset}`;
  const resolvedDecimals =
    decimals !== undefined && isFinite(decimals) && decimals >= 0
      ? Math.floor(decimals)
      : ASSET_DECIMALS[asset.toUpperCase()] ?? DEFAULT_DECIMALS;
  const value    = stroops ? num / 1e7 : num;
  const label    = asset === 'native' ? 'XLM' : asset.toUpperCase();
  return `${value.toFixed(resolvedDecimals)} ${label}`;
}

export function formatAmountValue(
  raw: string | number,
  asset: string = 'XLM',
  stroops = false,
  decimals?: number,
): string {
  return formatAmount(raw, asset, stroops, decimals).split(' ')[0];
}

export function isZeroAmount(raw: string | number): boolean {
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  return isFinite(num) && num === 0;
}

export function formatAmountCompact(
  raw: string | number,
  asset: string = 'XLM',
  stroops = false,
  decimals?: number,
): string {
  const num   = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (!isFinite(num)) return `— ${asset}`;
  const value = stroops ? num / 1e7 : num;
  const label = asset === 'native' ? 'XLM' : asset.toUpperCase();
  const resolvedDecimals =
    decimals !== undefined && isFinite(decimals) && decimals >= 0
      ? Math.floor(decimals)
      : 2;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${label}`;
  if (Math.abs(value) >= 1_000)     return `${(value / 1_000).toFixed(2)}K ${label}`;
  return `${value.toFixed(resolvedDecimals)} ${label}`;
}

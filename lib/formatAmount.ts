export type KnownAsset = 'XLM' | 'USDC' | 'native'

const ASSET_DECIMALS: Record<string, number> = {
  XLM: 7,
  USDC: 2,
  native: 7,
}

const DEFAULT_DECIMALS = 7

/** Resolve the number of base units per whole token for an asset. */
function resolveDecimals(asset: string, explicit?: number): number {
  if (explicit !== undefined && isFinite(explicit) && explicit >= 0) {
    return Math.floor(explicit)
  }
  return ASSET_DECIMALS[asset.toUpperCase()] ?? DEFAULT_DECIMALS
}

function labelFor(asset: string): string {
  return asset === 'native' ? 'XLM' : asset.toUpperCase()
}

export function formatAmount(
  raw: string | number,
  asset: string = 'XLM',
  stroops = false,
  decimals?: number,
): string {
  const num = typeof raw === 'string' ? parseFloat(raw) : raw
  if (!isFinite(num)) return `— ${labelFor(asset)}`

  // When `stroops` is set the caller is passing raw base units. An explicit
  // `decimals` value is the token's base-unit exponent, so it is the divisor.
  const baseUnitExponent = resolveDecimals(asset, decimals)
  const value = stroops ? num / 10 ** baseUnitExponent : num
  return `${value.toFixed(baseUnitExponent)} ${labelFor(asset)}`
}

export function formatAmountValue(
  raw: string | number,
  asset: string = 'XLM',
  stroops = false,
  decimals?: number,
): string {
  return formatAmount(raw, asset, stroops, decimals).split(' ')[0]
}

export function isZeroAmount(raw: string | number): boolean {
  const num = typeof raw === 'string' ? parseFloat(raw) : raw
  return isFinite(num) && num === 0
}

export function formatAmountCompact(
  raw: string | number,
  asset: string = 'XLM',
  stroops = false,
  decimals?: number,
): string {
  const num = typeof raw === 'string' ? parseFloat(raw) : raw
  if (!isFinite(num)) return `— ${labelFor(asset)}`

  const baseUnitExponent = resolveDecimals(asset, decimals)
  const value = stroops ? num / 10 ** baseUnitExponent : num
  const label = labelFor(asset)

  // Compact display always keeps two digits, independent of the token's
  // base-unit precision.
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M ${label}`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K ${label}`
  return `${value.toFixed(2)} ${label}`
}

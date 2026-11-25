/** Soroban closes a ledger roughly every 5 seconds. */
export const SECONDS_PER_LEDGER = 5

/** Show the warning when the instance has this many ledgers (or fewer) left (#593). */
export const EXPIRY_WARNING_LEDGERS = 100_000

export const CONTRACT_TTL_DOCS_URL =
  'https://developers.stellar.org/docs/build/guides/archival/extending-contract-ttl'

/** Ledgers left before the instance expires; negative once expired. */
export function ledgersUntilExpiry(liveUntilLedgerSeq: number, currentLedger: number): number {
  return liveUntilLedgerSeq - currentLedger
}

/** True when the instance expires within EXPIRY_WARNING_LEDGERS, including when already expired. */
export function isNearExpiry(liveUntilLedgerSeq: number, currentLedger: number): boolean {
  return ledgersUntilExpiry(liveUntilLedgerSeq, currentLedger) <= EXPIRY_WARNING_LEDGERS
}

export function estimateExpiryDate(
  liveUntilLedgerSeq: number,
  currentLedger: number,
  now: number = Date.now()
): Date {
  return new Date(now + ledgersUntilExpiry(liveUntilLedgerSeq, currentLedger) * SECONDS_PER_LEDGER * 1000)
}

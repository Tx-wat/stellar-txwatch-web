import {
  CONTRACT_TTL_DOCS_URL,
  EXPIRY_WARNING_LEDGERS,
  isNearExpiry,
  ledgersUntilExpiry,
} from '@/lib/contractExpiry'

interface ContractExpiryBannerProps {
  liveUntilLedgerSeq: number | null
  currentLedger: number | null
}

/** Warns when the contract instance is within EXPIRY_WARNING_LEDGERS of expiry (#593). */
export default function ContractExpiryBanner({ liveUntilLedgerSeq, currentLedger }: ContractExpiryBannerProps) {
  if (liveUntilLedgerSeq === null || currentLedger === null) return null
  if (!isNearExpiry(liveUntilLedgerSeq, currentLedger)) return null

  const remaining = ledgersUntilExpiry(liveUntilLedgerSeq, currentLedger)
  const message =
    remaining <= 0
      ? 'This contract instance has expired and may be archived.'
      : `This contract instance expires in ${remaining.toLocaleString()} ledgers (under ${EXPIRY_WARNING_LEDGERS.toLocaleString()}).`

  return (
    <div role="alert" data-testid="expiry-warning-banner" className="rounded-xl border border-amber-800 bg-amber-900/20 p-4">
      <p className="text-sm font-medium text-amber-300">Contract expiring soon</p>
      <p className="mt-1 text-sm text-amber-400">
        {message} Extend its TTL to avoid archival.{' '}
        <a
          href={CONTRACT_TTL_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-300"
        >
          Learn how to extend a contract&apos;s TTL
        </a>
      </p>
    </div>
  )
}

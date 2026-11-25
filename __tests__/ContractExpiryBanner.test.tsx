// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContractExpiryBanner from '@/components/ContractExpiryBanner'
import {
  CONTRACT_TTL_DOCS_URL,
  EXPIRY_WARNING_LEDGERS,
  isNearExpiry,
  estimateExpiryDate,
} from '@/lib/contractExpiry'

describe('isNearExpiry', () => {
  it('is true at the threshold and below, including expired', () => {
    expect(isNearExpiry(1000 + EXPIRY_WARNING_LEDGERS, 1000)).toBe(true)
    expect(isNearExpiry(1000 + 10, 1000)).toBe(true)
    expect(isNearExpiry(900, 1000)).toBe(true)
  })

  it('is false just beyond the threshold', () => {
    expect(isNearExpiry(1000 + EXPIRY_WARNING_LEDGERS + 1, 1000)).toBe(false)
  })
})

describe('estimateExpiryDate', () => {
  it('uses 5 seconds per ledger', () => {
    expect(estimateExpiryDate(1200, 1000, 0).getTime()).toBe(200 * 5 * 1000)
  })
})

describe('ContractExpiryBanner', () => {
  it('renders the warning with a docs link when near expiry', () => {
    render(<ContractExpiryBanner liveUntilLedgerSeq={1500} currentLedger={1000} />)
    expect(screen.getByTestId('expiry-warning-banner')).toHaveTextContent('500 ledgers')
    expect(screen.getByRole('link')).toHaveAttribute('href', CONTRACT_TTL_DOCS_URL)
  })

  it('says the instance expired when past its live-until ledger', () => {
    render(<ContractExpiryBanner liveUntilLedgerSeq={900} currentLedger={1000} />)
    expect(screen.getByTestId('expiry-warning-banner')).toHaveTextContent('has expired')
  })

  it('renders nothing when far from expiry or data is missing', () => {
    const { container, rerender } = render(
      <ContractExpiryBanner liveUntilLedgerSeq={1000 + EXPIRY_WARNING_LEDGERS + 5} currentLedger={1000} />
    )
    expect(container).toBeEmptyDOMElement()
    rerender(<ContractExpiryBanner liveUntilLedgerSeq={null} currentLedger={1000} />)
    expect(container).toBeEmptyDOMElement()
    rerender(<ContractExpiryBanner liveUntilLedgerSeq={1500} currentLedger={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})

// @vitest-environment jsdom
/**
 * ContractCard.test.tsx
 *
 * Component tests covering label/ID rendering, network badge, detail
 * link, webhook warning, highlight pulse, and last-alert states.
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ContractCard from '@/components/ContractCard'
import { WatchedContract } from '@/types'

// next/link needs the App Router context; render a plain anchor instead.
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string
    children: React.ReactNode
    [key: string]: unknown
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const CONTRACT_ID = 'C234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH'

const baseContract: WatchedContract = {
  id: 'contract-1',
  label: 'Treasury Vault',
  contract_id: CONTRACT_ID,
  network: 'testnet',
  rules: [{ type: 'AnyTransaction' }],
  webhook_url: 'https://example.com/hook',
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_000_000,
}

describe('ContractCard', () => {
  it('renders the contract label and truncated contract ID', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.getByText('Treasury Vault')).toBeInTheDocument()
    expect(
      screen.getByText(`${CONTRACT_ID.slice(0, 8)}...${CONTRACT_ID.slice(-8)}`)
    ).toBeInTheDocument()
  })

  it('renders the network badge', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.getByText('Testnet')).toBeInTheDocument()
  })

  it('links to the contract detail page', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/contracts/contract-1')
  })

  it('shows the active rule count', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.getByText(/active$/)).toHaveTextContent('1 rule active')
  })

  it('pluralises the rule count label', () => {
    render(
      <ContractCard
        contract={{
          ...baseContract,
          rules: [{ type: 'AnyTransaction' }, { type: 'TransactionFailed' }],
        }}
      />
    )
    expect(screen.getByText(/active$/)).toHaveTextContent('2 rules active')
  })

  it('warns when no webhook is configured', () => {
    render(<ContractCard contract={{ ...baseContract, webhook_url: '' }} />)
    expect(screen.getByText('No webhook configured')).toBeInTheDocument()
  })

  it('does not warn when a webhook is configured', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.queryByText('No webhook configured')).not.toBeInTheDocument()
  })

  it('applies animate-pulse while highlight is true', () => {
    const { container } = render(<ContractCard contract={baseContract} highlight={true} />)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('does not animate when highlight is false', () => {
    const { container } = render(<ContractCard contract={baseContract} highlight={false} />)
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })

  it('shows the last alert time when provided', () => {
    const ts = new Date('2024-06-01T12:00:00Z').getTime()
    render(<ContractCard contract={baseContract} lastAlertTime={ts} />)
    expect(screen.getByText(/Last alert/)).toBeInTheDocument()
    expect(screen.getByText(/Last alert/)).toHaveTextContent(
      new Date(ts).toLocaleDateString()
    )
  })

  it('shows "No alerts yet" when lastAlertTime is undefined', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.getByText('No alerts yet')).toBeInTheDocument()
  })
})

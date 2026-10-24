// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CompareContractsPage from '@/app/contracts/compare/page'
import { WatchedContract, AlertPayload } from '@/types'

const mockReplace = vi.fn()
let mockSearchParams = new URLSearchParams('a=contract-a&b=contract-b')

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}))

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

const contractsFixture: WatchedContract[] = [
  {
    id: 'contract-a',
    label: 'Token Contract',
    contract_id: 'C1111111111111111111111111111111111111111111111111111111',
    network: 'testnet',
    rules: [{ type: 'LargeTransfer', threshold_xlm: 500 }],
    webhook_url: 'https://example.com/a',
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
  },
  {
    id: 'contract-b',
    label: 'DEX Pool Contract',
    contract_id: 'C2222222222222222222222222222222222222222222222222222222',
    network: 'testnet',
    rules: [{ type: 'FunctionCalled', function_name: 'swap' }],
    webhook_url: 'https://example.com/b',
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
  },
]

const alertsFixture: Record<string, AlertPayload[]> = {
  'contract-a': [
    {
      label: 'Token Contract',
      contract_id: 'contract-a',
      network: 'testnet',
      rule_triggered: 'LargeTransfer',
      transaction_hash: 'txhash_token_1111111111111111111111111111111111111111',
      function_name: 'transfer',
      amount: 1000,
      timestamp: 1_700_000_060_000,
      horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx1',
    },
  ],
  'contract-b': [
    {
      label: 'DEX Pool Contract',
      contract_id: 'contract-b',
      network: 'testnet',
      rule_triggered: 'FunctionCalled',
      transaction_hash: 'txhash_dex_222222222222222222222222222222222222222222',
      function_name: 'swap',
      amount: 1000,
      timestamp: 1_700_000_060_000,
      horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx2',
    },
    {
      label: 'DEX Pool Contract',
      contract_id: 'contract-b',
      network: 'testnet',
      rule_triggered: 'AnyTransaction',
      transaction_hash: 'txhash_dex_333333333333333333333333333333333333333333',
      function_name: 'rebalance',
      timestamp: 1_700_000_000_000,
      horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx3',
    },
  ],
}

vi.mock('@/lib/storage', () => ({
  getContracts: () => contractsFixture,
  getAlerts: (id: string) => alertsFixture[id] ?? [],
  onAlertsChange: () => () => {},
  onContractsChange: () => () => {},
}))

describe('CompareContractsPage', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams('a=contract-a&b=contract-b')
    mockReplace.mockClear()
  })

  it('renders both contracts side by side with a shared timeline axis', () => {
    render(<CompareContractsPage />)

    expect(screen.getByText('Compare Contracts')).toBeInTheDocument()
    expect(screen.getByText('Token Contract')).toBeInTheDocument()
    expect(screen.getByText('DEX Pool Contract')).toBeInTheDocument()
    expect(screen.getByText(/Shared timeline axis:/i)).toBeInTheDocument()
    expect(screen.getByText('transfer')).toBeInTheDocument()
    expect(screen.getByText('swap')).toBeInTheDocument()
    expect(screen.getByText('rebalance')).toBeInTheDocument()
    expect(screen.getByText(/No alert at this timestamp/i)).toBeInTheDocument()
  })
})

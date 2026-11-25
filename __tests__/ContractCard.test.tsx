// @vitest-environment jsdom
/**
 * ContractCard.test.tsx
 *
 * Component tests covering label/ID rendering, network badge, detail
 * link, webhook warning, highlight pulse, and last-alert states.
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import ContractCard from '@/components/ContractCard'
import { WatchedContract } from '@/types'

const alertState = vi.hoisted(() => ({
  count: 0,
  listeners: new Set<() => void>(),
}))
vi.mock('@/lib/storage', () => ({
  getTodayAlertCount: () => alertState.count,
  onAlertsChange: (cb: () => void) => {
    alertState.listeners.add(cb)
    return () => alertState.listeners.delete(cb)
  },
}))

// next/link needs the App Router context; render a plain anchor instead.
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
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

  it('opens context menu with Compare action and navigates to comparison page', async () => {
    const { fireEvent } = await import('@testing-library/react')
    mockPush.mockClear()
    render(<ContractCard contract={baseContract} />)

    fireEvent.contextMenu(screen.getByText('Treasury Vault'))
    const compareBtn = screen.getByRole('menuitem', { name: /Compare/i })
    expect(compareBtn).toBeInTheDocument()

    fireEvent.click(compareBtn)
    expect(mockPush).toHaveBeenCalledWith('/contracts/compare?a=contract-1')
  })
})

describe('ContractCard today alert badge', () => {
  beforeEach(() => {
    alertState.count = 0
    alertState.listeners.clear()
  })

  it('hides the badge when there are no alerts today', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.queryByTestId('today-alert-badge')).not.toBeInTheDocument()
  })

  it('shows today\'s alert count', () => {
    alertState.count = 3
    render(<ContractCard contract={baseContract} />)
    expect(screen.getByTestId('today-alert-badge')).toHaveTextContent('3')
    expect(screen.getByLabelText('3 alerts today')).toBeInTheDocument()
  })

  it('uses the singular label for one alert and caps large counts', () => {
    alertState.count = 1
    const { unmount } = render(<ContractCard contract={baseContract} />)
    expect(screen.getByLabelText('1 alert today')).toBeInTheDocument()
    unmount()
    alertState.count = 250
    render(<ContractCard contract={baseContract} />)
    expect(screen.getByTestId('today-alert-badge')).toHaveTextContent('99+')
  })

  it('updates when alerts change and unsubscribes on unmount', () => {
    const { unmount } = render(<ContractCard contract={baseContract} />)
    expect(screen.queryByTestId('today-alert-badge')).not.toBeInTheDocument()
    act(() => {
      alertState.count = 2
      alertState.listeners.forEach((cb) => cb())
    })
    expect(screen.getByTestId('today-alert-badge')).toHaveTextContent('2')
    unmount()
    expect(alertState.listeners.size).toBe(0)
  })
})

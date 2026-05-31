import { render, screen } from '@testing-library/react'
import WebhookLog from '@/components/WebhookLog'
import { AlertPayload } from '@/types'

jest.mock('@/lib/stellar', () => ({
  explorerTxUrl: (_network: string, hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
}))

const baseAlert: AlertPayload = {
  label: 'Test Contract',
  contract_id: 'C123',
  network: 'testnet',
  rule_triggered: 'large_transfer',
  transaction_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  timestamp: new Date('2024-01-15T12:00:00Z').getTime(),
  horizon_link: 'https://horizon-testnet.stellar.org/transactions/abcdef',
}

describe('WebhookLog', () => {
  it('renders empty state when there are no alerts', () => {
    render(<WebhookLog alerts={[]} network="testnet" />)
    expect(screen.getByText('No alerts yet')).toBeInTheDocument()
  })

  it('renders alert rows when alerts are provided', () => {
    render(<WebhookLog alerts={[baseAlert]} network="testnet" />)
    expect(screen.getByText('large_transfer')).toBeInTheDocument()
  })

  it('renders explorer link with shortened tx hash', () => {
    render(<WebhookLog alerts={[baseAlert]} network="testnet" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', expect.stringContaining(baseAlert.transaction_hash))
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders timestamp', () => {
    render(<WebhookLog alerts={[baseAlert]} network="testnet" />)
    expect(screen.getByText(/2024|Jan|15/)).toBeInTheDocument()
  })

  it('shows N/A for missing function_name', () => {
    render(<WebhookLog alerts={[{ ...baseAlert, function_name: undefined }]} network="testnet" />)
    expect(screen.getByText('N/A')).toBeInTheDocument()
  })

  it('shows function_name when present', () => {
    render(<WebhookLog alerts={[{ ...baseAlert, function_name: 'transfer' }]} network="testnet" />)
    expect(screen.getByText('transfer')).toBeInTheDocument()
  })

  it('shows N/A for missing amount', () => {
    render(<WebhookLog alerts={[{ ...baseAlert, amount: undefined }]} network="testnet" />)
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(1)
  })

  it('shows formatted amount when present', () => {
    render(<WebhookLog alerts={[{ ...baseAlert, amount: 100 }]} network="testnet" />)
    expect(screen.getByText('100 XLM')).toBeInTheDocument()
  })

  it('shows export CSV button', () => {
    render(<WebhookLog alerts={[baseAlert]} network="testnet" />)
    expect(screen.getByText('Export CSV')).toBeInTheDocument()
  })

  it('renders a copy button for the transaction hash', () => {
    render(<WebhookLog alerts={[baseAlert]} network="testnet" />)
    const copyBtn = screen.getByTitle('Copy to clipboard')
    expect(copyBtn).toBeInTheDocument()
  })
})

// @vitest-environment jsdom
/**
 * WebhookLog.test.tsx
 *
 * Component tests covering empty state, alert rows, explorer links,
 * amount/function formatting, rule-type filtering, and CSV export.
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import WebhookLog from '@/components/WebhookLog'
import { AlertPayload } from '@/types'

const baseAlert: AlertPayload = {
  label: 'Test Contract',
  contract_id: 'C123',
  network: 'testnet',
  rule_triggered: 'LargeTransfer',
  transaction_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  timestamp: new Date('2024-01-15T12:00:00Z').getTime(),
  horizon_link: 'https://horizon-testnet.stellar.org/transactions/abcdef',
}

const largeTransferAlert: AlertPayload = {
  ...baseAlert,
  rule_triggered: 'LargeTransfer',
  amount: 500,
}

const functionCalledAlert: AlertPayload = {
  ...baseAlert,
  rule_triggered: 'FunctionCalled',
  function_name: 'transfer',
  amount: 100,
}

const failedAlert: AlertPayload = {
  ...baseAlert,
  rule_triggered: 'TransactionFailed',
}

beforeEach(() => {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  // @ts-expect-error cleanup of the test-only stub
  delete URL.createObjectURL
  // @ts-expect-error cleanup of the test-only stub
  delete URL.revokeObjectURL
})

describe('WebhookLog', () => {
  it('renders empty state when there are no alerts', () => {
    render(<WebhookLog alerts={[]} network="testnet" />)
    expect(screen.getByText('No alerts yet')).toBeInTheDocument()
  })

  it('renders alert rows when alerts are provided', () => {
    render(<WebhookLog alerts={[baseAlert]} network="testnet" />)
    expect(screen.getByText('Large Transfer')).toBeInTheDocument()
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
    render(
      <WebhookLog
        alerts={[{ ...baseAlert, function_name: undefined, amount: 42 }]}
        network="testnet"
      />
    )
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

  it('shows all alerts when the All Rules filter is active', () => {
    render(
      <WebhookLog
        alerts={[largeTransferAlert, functionCalledAlert, failedAlert]}
        network="testnet"
      />
    )
    expect(screen.getByText('3 of 3 alerts')).toBeInTheDocument()
    expect(screen.getByText('Large Transfer')).toBeInTheDocument()
    expect(screen.getByText('Function Called')).toBeInTheDocument()
    expect(screen.getByText('Tx Failed')).toBeInTheDocument()
  })

  it('filters rows to the selected rule type', () => {
    render(
      <WebhookLog
        alerts={[largeTransferAlert, functionCalledAlert, failedAlert]}
        network="testnet"
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'LargeTransfer' }))

    expect(screen.getByText('1 of 3 alerts')).toBeInTheDocument()
    expect(screen.getByText('Large Transfer')).toBeInTheDocument()
    expect(screen.queryByText('Function Called')).not.toBeInTheDocument()
    expect(screen.queryByText('Tx Failed')).not.toBeInTheDocument()
  })

  it('shows a no-match message when the filter returns zero results', () => {
    render(<WebhookLog alerts={[largeTransferAlert]} network="testnet" />)
    fireEvent.click(screen.getByRole('button', { name: 'FunctionCalled' }))
    expect(
      screen.getByText('No alerts match the selected filter.')
    ).toBeInTheDocument()
    expect(screen.queryByText('Large Transfer')).not.toBeInTheDocument()
  })

  it('exports the filtered alerts as CSV via a blob URL', () => {
    const createObjectURL = URL.createObjectURL as ReturnType<typeof vi.fn>
    const revokeObjectURL = URL.revokeObjectURL as ReturnType<typeof vi.fn>

    render(
      <WebhookLog alerts={[largeTransferAlert, functionCalledAlert]} network="testnet" />
    )
    // Narrow to one rule so the exported CSV contains only that row
    fireEvent.click(screen.getByRole('button', { name: 'LargeTransfer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('text/csv')

    return blob.text().then((text) => {
      expect(text).toContain('"Time","Rule","Tx Hash","Function","Amount"')
      expect(text).toContain('LargeTransfer')
      expect(text).not.toContain('FunctionCalled')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })

  it('links each row to Stellar Expert with the network-scoped URL', () => {
    render(<WebhookLog alerts={[baseAlert]} network="testnet" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      `https://stellar.expert/explorer/testnet/tx/${baseAlert.transaction_hash}`
    )
  })

  it('uses the public explorer path for mainnet alerts', () => {
    render(
      <WebhookLog alerts={[{ ...baseAlert, network: 'mainnet' }]} network="mainnet" />
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('/explorer/public/tx/')
    )
  })

  it('shows N/A in the amount column when amount is undefined', () => {
    render(<WebhookLog alerts={[{ ...baseAlert, amount: undefined }]} network="testnet" />)
    const row = screen.getByText('Large Transfer').closest('tr')!
    expect(within(row).getAllByText('N/A').length).toBeGreaterThanOrEqual(1)
  })
})

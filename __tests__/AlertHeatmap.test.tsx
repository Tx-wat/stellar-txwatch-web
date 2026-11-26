import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AlertHeatmap from '../components/AlertHeatmap'
import { AlertPayload } from '@/types'

function makeAlert(daysAgo: number): AlertPayload {
  const timestamp = Date.now() - daysAgo * 24 * 60 * 60 * 1000
  return {
    label: 'Test Alert',
    contract_id: 'C_HEATMAP_TOOLTIP',
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: `tx_${daysAgo}`,
    timestamp,
    horizon_link: 'https://horizon-testnet.stellar.org',
  }
}

describe('AlertHeatmap tooltip (issue #628)', () => {
  it('shows an accessible title attribute with the exact daily count', () => {
    const alerts = [makeAlert(0), makeAlert(0), makeAlert(0)]
    render(<AlertHeatmap alerts={alerts} days={30} />)
    const cells = screen.getAllByRole('gridcell')
    const today = cells[cells.length - 1]
    expect(today).toHaveAttribute('title', expect.stringContaining('3 alerts'))
    expect(today).toHaveAttribute('aria-label', expect.stringContaining('3 alerts'))
  })

  it('renders a hover tooltip with the date and count on focus/hover', () => {
    const alerts = [makeAlert(0)]
    render(<AlertHeatmap alerts={alerts} days={30} />)
    const cells = screen.getAllByRole('gridcell')
    const today = cells[cells.length - 1]
    fireEvent.mouseEnter(today)
    expect(screen.getByText('1 alert')).toBeInTheDocument()
    fireEvent.mouseLeave(today)
  })

  it('shows zero-count tooltip for days with no alerts', () => {
    render(<AlertHeatmap alerts={[]} days={30} />)
    const cells = screen.getAllByRole('gridcell')
    expect(cells[0]).toHaveAttribute('title', expect.stringContaining('0 alerts'))
  })
})

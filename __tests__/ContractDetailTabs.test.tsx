import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContractDetailPage from '@/app/contracts/[id]/page'
import * as storage from '@/lib/storage'

const CONTRACT = {
  contract_id: 'CABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ2',
  label: 'Test Contract',
  network: 'testnet' as const,
  webhook_url: 'https://example.com/webhook',
  created_at: Date.now(),
  rules: [],
  enabled: true,
}

describe('ContractDetailPage tab navigation (issue #629)', () => {
  beforeEach(() => {
    vi.spyOn(storage, 'getContract').mockReturnValue(CONTRACT as any)
    vi.spyOn(storage, 'getAlerts').mockReturnValue([])
    window.location.hash = ''
  })

  it('renders a tablist with Overview, Alert Rules, and Webhook History', () => {
    render(<ContractDetailPage params={{ id: 'CABCDEF' }} />)
    const tablist = screen.getByRole('tablist', { name: /contract detail sections/i })
    expect(tablist).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Alert Rules' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Webhook History' })).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking a tab activates its panel and updates the URL hash', () => {
    render(<ContractDetailPage params={{ id: 'CABCDEF' }} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Alert Rules' }))
    expect(screen.getByRole('tab', { name: 'Alert Rules' })).toHaveAttribute('aria-selected', 'true')
    expect(window.location.hash).toBe('#rules')
    expect(document.getElementById('contract-tabpanel-rules')).not.toHaveAttribute('hidden')
    expect(document.getElementById('contract-tabpanel-overview')).toHaveAttribute('hidden')
  })

  it('supports ArrowRight/ArrowLeft keyboard navigation between tabs', () => {
    render(<ContractDetailPage params={{ id: 'CABCDEF' }} />)
    const overviewTab = screen.getByRole('tab', { name: 'Overview' })
    fireEvent.keyDown(overviewTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: 'Alert Rules' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Alert Rules' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })
})

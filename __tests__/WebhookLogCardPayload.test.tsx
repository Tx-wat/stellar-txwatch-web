// @vitest-environment jsdom
/**
 * Tests for the alert detail modal / View Payload button (issue #604).
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WebhookLogCard, WebhookEntry } from '@/components/WebhookLogCard'

vi.mock('@/hooks/useExplorerPreference', () => ({
  useExplorerPreference: () => 'stellar-expert',
}))

vi.mock('@/lib/explorer', () => ({
  explorerTxUrl: (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`,
  getExplorerName: () => 'Stellar Expert',
}))

const base: WebhookEntry = {
  id: '1',
  timestamp: '2024-03-15T10:00:00Z',
  event: 'transfer',
  status: 'success',
}

describe('WebhookLogCard — View Payload button (issue #604)', () => {
  it('renders a View Payload button', () => {
    render(<WebhookLogCard entry={base} />)
    expect(screen.getByRole('button', { name: /View full alert payload/i })).toBeInTheDocument()
  })

  it('opens the payload modal when View Payload is clicked', () => {
    render(<WebhookLogCard entry={base} />)
    fireEvent.click(screen.getByRole('button', { name: /View full alert payload/i }))
    expect(screen.getByRole('dialog', { name: /Alert payload/i })).toBeInTheDocument()
  })

  it('shows the full entry JSON in the modal', () => {
    render(<WebhookLogCard entry={base} />)
    fireEvent.click(screen.getByRole('button', { name: /View full alert payload/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('"event"')
    expect(dialog).toHaveTextContent('"transfer"')
  })

  it('closes the modal when the close button is clicked', () => {
    render(<WebhookLogCard entry={base} />)
    fireEvent.click(screen.getByRole('button', { name: /View full alert payload/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Close modal/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders a copy button inside the modal', () => {
    render(<WebhookLogCard entry={base} />)
    fireEvent.click(screen.getByRole('button', { name: /View full alert payload/i }))
    expect(screen.getByRole('button', { name: /Copy payload/i })).toBeInTheDocument()
  })
})

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from '@/components/EmptyState'

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

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Nothing here yet." />)
    expect(screen.getByText('No items')).toBeInTheDocument()
    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
  })

  it('renders an optional action node', () => {
    render(
      <EmptyState
        title="No items"
        description="Nothing here yet."
        action={<button>Do something</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Do something' })).toBeInTheDocument()
  })

  it('does not render the quick-start guide by default', () => {
    render(<EmptyState title="No items" description="Nothing here yet." />)
    expect(screen.queryByText('Quick-start guide')).not.toBeInTheDocument()
  })

  it('renders the quick-start guide when quickStart is true', () => {
    render(<EmptyState title="No contracts yet" description="Add a contract." quickStart />)
    expect(screen.getByText(/quick-start guide/i)).toBeInTheDocument()
  })

  it('renders all three quick-start steps', () => {
    render(<EmptyState title="No contracts yet" description="Add a contract." quickStart />)
    expect(screen.getByText('Install Freighter')).toBeInTheDocument()
    expect(screen.getByText('Get testnet XLM')).toBeInTheDocument()
    expect(screen.getByText('Watch a contract')).toBeInTheDocument()
  })

  it('links to the Freighter website', () => {
    render(<EmptyState title="No contracts yet" description="Add a contract." quickStart />)
    const link = screen.getByRole('link', { name: /freighter\.app/i })
    expect(link).toHaveAttribute('href', 'https://freighter.app')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('links to the Friendbot faucet', () => {
    render(<EmptyState title="No contracts yet" description="Add a contract." quickStart />)
    const link = screen.getByRole('link', { name: /open friendbot/i })
    expect(link).toHaveAttribute('href', expect.stringContaining('laboratory.stellar.org'))
  })

  it('links to add-contract page for step 3', () => {
    render(<EmptyState title="No contracts yet" description="Add a contract." quickStart />)
    const link = screen.getByRole('link', { name: /add your first contract/i })
    expect(link).toHaveAttribute('href', '/contracts/new')
  })
})

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContractDetailErrorBoundary from '@/components/ContractDetailErrorBoundary'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

// Suppress React's error boundary console.error noise in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('RPC exploded')
  return <div>Content loaded</div>
}

describe('ContractDetailErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ContractDetailErrorBoundary>
        <Bomb shouldThrow={false} />
      </ContractDetailErrorBoundary>
    )
    expect(screen.getByText('Content loaded')).toBeInTheDocument()
  })

  it('renders the error UI when a child throws', () => {
    render(
      <ContractDetailErrorBoundary>
        <Bomb shouldThrow={true} />
      </ContractDetailErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/temporary Soroban RPC issue/)).toBeInTheDocument()
  })

  it('shows a "Try again" button when in error state', () => {
    render(
      <ContractDetailErrorBoundary>
        <Bomb shouldThrow={true} />
      </ContractDetailErrorBoundary>
    )
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('shows a "Back to contracts" link when in error state', () => {
    render(
      <ContractDetailErrorBoundary>
        <Bomb shouldThrow={true} />
      </ContractDetailErrorBoundary>
    )
    const link = screen.getByRole('link', { name: /back to contracts/i })
    expect(link).toHaveAttribute('href', '/contracts')
  })

  it('resets the error state when "Try again" is clicked', () => {
    // Use a component controlled by an external flag to avoid strict-mode double-invoke issues.
    let shouldThrow = true
    function MaybeThrow() {
      if (shouldThrow) throw new Error('First render throws')
      return <div>Recovered</div>
    }

    render(
      <ContractDetailErrorBoundary>
        <MaybeThrow />
      </ContractDetailErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    // Allow recovery on the next render cycle
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(screen.getByText('Recovered')).toBeInTheDocument()
  })

  it('reports the error to Sentry when DSN is set', async () => {
    const { captureException } = await import('@sentry/nextjs')
    const originalDsn = process.env.NEXT_PUBLIC_SENTRY_DSN
    // @ts-ignore
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://fake@sentry.io/123'

    render(
      <ContractDetailErrorBoundary>
        <Bomb shouldThrow={true} />
      </ContractDetailErrorBoundary>
    )

    expect(captureException).toHaveBeenCalled()
    // @ts-ignore
    process.env.NEXT_PUBLIC_SENTRY_DSN = originalDsn
  })
})

// @vitest-environment jsdom
/**
 * Tests for the webhook secret Show/Hide toggle on contract detail (issue #607).
 * These tests exercise the toggle logic in isolation.
 */
import '@testing-library/jest-dom/vitest'
import React, { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/** Minimal replica of the webhook secret section from the contract detail page. */
function WebhookSecretSection({ secret }: { secret: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <p data-testid="label">Webhook Secret</p>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide webhook secret' : 'Show webhook secret'}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
      <p data-testid="secret-value">
        {visible ? secret : `••••••••${secret.slice(-4)}`}
      </p>
    </div>
  )
}

describe('Webhook Secret toggle (issue #607)', () => {
  const SECRET = 'supersecretvalue1234'

  it('masks the secret by default', () => {
    render(<WebhookSecretSection secret={SECRET} />)
    expect(screen.getByTestId('secret-value')).toHaveTextContent(`••••••••${SECRET.slice(-4)}`)
    expect(screen.getByTestId('secret-value')).not.toHaveTextContent(SECRET)
  })

  it('shows a Show button when secret is hidden', () => {
    render(<WebhookSecretSection secret={SECRET} />)
    expect(screen.getByRole('button', { name: 'Show webhook secret' })).toBeInTheDocument()
  })

  it('reveals the full secret when Show is clicked', () => {
    render(<WebhookSecretSection secret={SECRET} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show webhook secret' }))
    expect(screen.getByTestId('secret-value')).toHaveTextContent(SECRET)
  })

  it('hides the secret again when Hide is clicked', () => {
    render(<WebhookSecretSection secret={SECRET} />)
    fireEvent.click(screen.getByRole('button', { name: 'Show webhook secret' }))
    expect(screen.getByRole('button', { name: 'Hide webhook secret' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide webhook secret' }))
    expect(screen.getByTestId('secret-value')).toHaveTextContent(`••••••••${SECRET.slice(-4)}`)
    expect(screen.getByTestId('secret-value')).not.toHaveTextContent(SECRET)
  })
})

// @vitest-environment jsdom
/**
 * Accessibility coverage for the contract detail loading skeleton (#588).
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import * as matchers from 'vitest-axe/matchers'
import { describe, it, expect } from 'vitest'
import ContractDetailLoading from '@/app/contracts/[id]/loading'

expect.extend(matchers)

describe('ContractDetailLoading', () => {
  it('announces the loading state to assistive technology', () => {
    render(<ContractDetailLoading />)

    const status = screen.getByRole('status', { name: /loading contract details/i })
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent(/loading contract details/i)
  })

  it('renders a layout-matched skeleton for header, rules and webhook log', () => {
    const { container } = render(<ContractDetailLoading />)

    // Header (label + badge + buttons), active rule pills and table columns/rows.
    expect(container.querySelectorAll('.bg-zinc-800.rounded').length).toBeGreaterThan(20)
    expect(container.querySelector('.grid-cols-7')).not.toBeNull()
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(3)
  })

  it('has no automated axe violations', async () => {
    const { container } = render(<ContractDetailLoading />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

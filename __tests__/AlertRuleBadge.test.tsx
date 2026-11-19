// @vitest-environment jsdom
/**
 * AlertRuleBadge.test.tsx
 *
 * Rendering tests for every AlertRuleType variant: label text,
 * distinct colour classes, tooltip on hover, and graceful handling
 * of unknown types.
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AlertRuleBadge from '@/components/AlertRuleBadge'
import { AlertRuleType } from '@/types'

const VARIANTS: Array<{ type: AlertRuleType; label: string; colorClass: string }> = [
  { type: 'LargeTransfer', label: 'Large Transfer', colorClass: 'bg-orange-500/20' },
  { type: 'AdminFunctionCalled', label: 'Admin Function', colorClass: 'bg-red-500/20' },
  { type: 'AnyTransaction', label: 'Any Transaction', colorClass: 'bg-blue-500/20' },
  { type: 'FunctionCalled', label: 'Function Called', colorClass: 'bg-cyan-500/20' },
  { type: 'TransactionFailed', label: 'Tx Failed', colorClass: 'bg-rose-500/20' },
]

describe('AlertRuleBadge', () => {
  it.each(VARIANTS)('renders the $type badge with its label', ({ type, label }) => {
    render(<AlertRuleBadge type={type} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it.each(VARIANTS)('applies the distinct colour class for $type', ({ type, colorClass }) => {
    const { container } = render(<AlertRuleBadge type={type} />)
    const badge = container.querySelector('span')
    expect(badge?.className).toContain(colorClass)
  })

  it('uses a unique colour class for every rule type', () => {
    const classes = VARIANTS.map(({ type }) => {
      const { container } = render(<AlertRuleBadge type={type} />)
      return container.querySelector('span')!.className
    })
    expect(new Set(classes).size).toBe(VARIANTS.length)
  })

  it('shows the description tooltip on hover', () => {
    render(<AlertRuleBadge type="LargeTransfer" />)
    fireEvent.mouseEnter(screen.getByText('Large Transfer'))
    expect(
      screen.getByText('Alert when a transfer exceeds the specified XLM threshold')
    ).toBeInTheDocument()
  })

  it('hides the tooltip again on mouse leave', () => {
    render(<AlertRuleBadge type="LargeTransfer" />)
    const badge = screen.getByText('Large Transfer')
    fireEvent.mouseEnter(badge)
    fireEvent.mouseLeave(badge)
    expect(
      screen.queryByText('Alert when a transfer exceeds the specified XLM threshold')
    ).not.toBeInTheDocument()
  })

  it('renders gracefully for an unknown rule type without throwing', () => {
    expect(() =>
      render(<AlertRuleBadge type={'Bogus' as AlertRuleType} />)
    ).not.toThrow()
  })

  it('matches the expected markup for the default badge', () => {
    const { container } = render(<AlertRuleBadge type="AnyTransaction" />)
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div
        class="relative inline-block"
      >
        <span
          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border cursor-help bg-blue-500/20 text-blue-400 border-blue-500/30"
        >
          Any Transaction
        </span>
      </div>
    `)
  })
})

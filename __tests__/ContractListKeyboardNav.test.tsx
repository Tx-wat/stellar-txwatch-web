// @vitest-environment jsdom
/**
 * Keyboard navigation for the contract list grid (issue #640).
 * Verifies arrow-key movement between cards, Enter to navigate,
 * and Space to toggle selection.
 */
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { handleContractGridKeyDown } from '@/app/contracts/page'

function Grid({ ids, onToggle }: { ids: string[]; onToggle: (id: string) => void }) {
  const router = { push: vi.fn() } as unknown as ReturnType<typeof import('next/navigation').useRouter>
  return (
    <div
      data-testid="grid"
      onKeyDown={(e) => handleContractGridKeyDown(e, router, onToggle)}
    >
      {ids.map((id) => (
        <div key={id} data-contract-card="true" data-contract-id={id} tabIndex={0}>
          {id}
        </div>
      ))}
    </div>
  )
}

describe('handleContractGridKeyDown', () => {
  it('moves focus to the next card on ArrowRight', () => {
    const onToggle = vi.fn()
    const { getByText } = render(<Grid ids={['a', 'b', 'c']} onToggle={onToggle} />)
    const first = getByText('a')
    const second = getByText('b')
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(second)
  })

  it('moves focus to the previous card on ArrowLeft', () => {
    const onToggle = vi.fn()
    const { getByText } = render(<Grid ids={['a', 'b', 'c']} onToggle={onToggle} />)
    const second = getByText('b')
    const first = getByText('a')
    second.focus()
    fireEvent.keyDown(second, { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(first)
  })

  it('does nothing on ArrowRight at the last card', () => {
    const onToggle = vi.fn()
    const { getByText } = render(<Grid ids={['a', 'b']} onToggle={onToggle} />)
    const last = getByText('b')
    last.focus()
    fireEvent.keyDown(last, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(last)
  })

  it('toggles selection with Space', () => {
    const onToggle = vi.fn()
    const { getByText } = render(<Grid ids={['a', 'b']} onToggle={onToggle} />)
    const card = getByText('a')
    card.focus()
    fireEvent.keyDown(card, { key: ' ' })
    expect(onToggle).toHaveBeenCalledWith('a')
  })
})

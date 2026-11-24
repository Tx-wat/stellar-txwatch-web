// @vitest-environment jsdom
/**
 * Bulk delete confirmation flow (issue #584).
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import BulkActionBar from '@/components/BulkActionBar'

function renderBar(selectedCount = 2, onDeleteSelected = vi.fn()) {
  const props = {
    selectedCount,
    allVisibleSelected: false,
    onToggleSelectAll: vi.fn(),
    onClearSelection: vi.fn(),
    onDeleteSelected,
  }
  return { ...render(<BulkActionBar {...props} />), onDeleteSelected, props }
}

describe('BulkActionBar', () => {
  it('does not delete without a confirmation', () => {
    const { onDeleteSelected } = renderBar()

    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }))

    expect(screen.getByRole('dialog', { name: /delete selected contracts/i })).toBeInTheDocument()
    expect(onDeleteSelected).not.toHaveBeenCalled()
  })

  it('closes the dialog on cancel without deleting', async () => {
    const { onDeleteSelected } = renderBar()

    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(onDeleteSelected).not.toHaveBeenCalled()
  })

  it('deletes all selected contracts on confirmation', async () => {
    const { onDeleteSelected } = renderBar(3)

    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    const dialog = screen.getByRole('dialog', { name: /delete selected contracts/i })
    expect(dialog).toHaveTextContent('3 contracts')
    fireEvent.click(screen.getByRole('button', { name: /delete 3 contracts/i }))

    await waitFor(() => {
      expect(onDeleteSelected).toHaveBeenCalledTimes(1)
    })
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('uses singular wording for one selected contract', () => {
    renderBar(1)

    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }))

    expect(screen.getByRole('dialog')).toHaveTextContent('1 contract')
    expect(screen.getByRole('button', { name: /delete 1 contract/i })).toBeInTheDocument()
  })

  it('closes a pending confirmation when the selection is cleared', async () => {
    const { rerender, props } = renderBar(2)

    fireEvent.click(screen.getByRole('button', { name: /delete selected/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    rerender(<BulkActionBar {...props} selectedCount={0} />)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})

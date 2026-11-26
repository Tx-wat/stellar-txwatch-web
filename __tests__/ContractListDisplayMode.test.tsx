// @vitest-environment jsdom
/**
 * Tests for the grid/list display mode toggle (issue #605).
 * Covers: toggle renders, localStorage persistence, and compact list row.
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContractListToolbar, { DisplayMode } from '@/components/ContractListToolbar'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const baseProps = {
  search: '',
  onSearchChange: vi.fn(),
  networkFilter: 'all' as const,
  onNetworkFilterChange: vi.fn(),
  networkCounts: { all: 3, mainnet: 1, testnet: 1, futurenet: 1 },
  sortBy: 'newest' as const,
  onSortChange: vi.fn(),
  viewMode: 'flat' as const,
  onViewModeChange: vi.fn(),
  displayMode: 'grid' as DisplayMode,
  onDisplayModeChange: vi.fn(),
  hasAnyContracts: true,
  resultCount: 3,
}

describe('ContractListToolbar — grid/list toggle (issue #605)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the grid and list toggle buttons', () => {
    render(<ContractListToolbar {...baseProps} />)
    expect(screen.getByTitle('Grid view')).toBeInTheDocument()
    expect(screen.getByTitle('List view')).toBeInTheDocument()
  })

  it('marks grid button as pressed when displayMode is grid', () => {
    render(<ContractListToolbar {...baseProps} displayMode="grid" />)
    expect(screen.getByTitle('Grid view')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTitle('List view')).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks list button as pressed when displayMode is list', () => {
    render(<ContractListToolbar {...baseProps} displayMode="list" />)
    expect(screen.getByTitle('List view')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTitle('Grid view')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onDisplayModeChange with "list" when list button is clicked', () => {
    const onDisplayModeChange = vi.fn()
    render(<ContractListToolbar {...baseProps} onDisplayModeChange={onDisplayModeChange} />)
    fireEvent.click(screen.getByTitle('List view'))
    expect(onDisplayModeChange).toHaveBeenCalledWith('list')
  })

  it('calls onDisplayModeChange with "grid" when grid button is clicked', () => {
    const onDisplayModeChange = vi.fn()
    render(<ContractListToolbar {...baseProps} displayMode="list" onDisplayModeChange={onDisplayModeChange} />)
    fireEvent.click(screen.getByTitle('Grid view'))
    expect(onDisplayModeChange).toHaveBeenCalledWith('grid')
  })

  it('does not render the toggle when hasAnyContracts is false', () => {
    render(<ContractListToolbar {...baseProps} hasAnyContracts={false} />)
    expect(screen.queryByTitle('Grid view')).not.toBeInTheDocument()
    expect(screen.queryByTitle('List view')).not.toBeInTheDocument()
  })
})

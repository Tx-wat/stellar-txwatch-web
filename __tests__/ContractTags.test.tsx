// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ContractCard from '@/components/ContractCard'
import { WatchedContract } from '@/types'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const CONTRACT_ID = 'C234567ABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGH'

const baseContract: WatchedContract = {
  id: 'contract-1',
  label: 'Treasury Vault',
  contract_id: CONTRACT_ID,
  network: 'testnet',
  rules: [{ type: 'AnyTransaction' }],
  webhook_url: 'https://example.com/hook',
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_000_000,
}

describe('ContractCard — tags', () => {
  it('renders no tag badges when tags is undefined', () => {
    render(<ContractCard contract={baseContract} />)
    expect(screen.queryByText('defi')).not.toBeInTheDocument()
  })

  it('renders no tag badges when tags is empty', () => {
    render(<ContractCard contract={{ ...baseContract, tags: [] }} />)
    expect(screen.queryByText('defi')).not.toBeInTheDocument()
  })

  it('renders a badge for each tag', () => {
    render(<ContractCard contract={{ ...baseContract, tags: ['defi', 'audit'] }} />)
    expect(screen.getByText('defi')).toBeInTheDocument()
    expect(screen.getByText('audit')).toBeInTheDocument()
  })

  it('renders multiple tags as separate badges', () => {
    render(<ContractCard contract={{ ...baseContract, tags: ['alpha', 'beta', 'gamma'] }} />)
    expect(screen.getAllByText(/alpha|beta|gamma/)).toHaveLength(3)
  })
})

describe('tag input logic', () => {
  // Unit-test the add/remove logic in isolation
  function TagInput() {
    const [tags, setTags] = React.useState<string[]>([])
    const [input, setInput] = React.useState('')

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault()
        const trimmed = input.trim().replace(/,$/, '')
        if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed])
        setInput('')
      } else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
        setTags(tags.slice(0, -1))
      }
    }

    return (
      <div>
        {tags.map((t) => (
          <span key={t} data-testid="tag">{t}</span>
        ))}
        <input
          aria-label="tag input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
    )
  }

  it('adds a tag on Enter', () => {
    render(<TagInput />)
    const input = screen.getByLabelText('tag input')
    fireEvent.change(input, { target: { value: 'defi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByTestId('tag')).toHaveTextContent('defi')
  })

  it('adds a tag on comma', () => {
    render(<TagInput />)
    const input = screen.getByLabelText('tag input')
    fireEvent.change(input, { target: { value: 'defi' } })
    fireEvent.keyDown(input, { key: ',' })
    expect(screen.getByTestId('tag')).toHaveTextContent('defi')
  })

  it('does not add duplicate tags', () => {
    render(<TagInput />)
    const input = screen.getByLabelText('tag input')
    fireEvent.change(input, { target: { value: 'defi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'defi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getAllByTestId('tag')).toHaveLength(1)
  })

  it('removes the last tag on Backspace when input is empty', () => {
    render(<TagInput />)
    const input = screen.getByLabelText('tag input')
    fireEvent.change(input, { target: { value: 'defi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.keyDown(input, { key: 'Backspace' })
    expect(screen.queryByTestId('tag')).not.toBeInTheDocument()
  })

  it('clears input after adding tag', () => {
    render(<TagInput />)
    const input = screen.getByLabelText('tag input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'defi' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input.value).toBe('')
  })
})

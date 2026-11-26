// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ToastProvider, useToast } from '@/components/ToastProvider'

function Trigger({ count }: { count: number }) {
  const { addToast } = useToast()
  return (
    <button
      onClick={() => {
        for (let i = 0; i < count; i++) addToast(`Message ${i}`, 'info', 0)
      }}
    >
      Fire
    </button>
  )
}

describe('ToastProvider', () => {
  it('limits visible toasts to 3 and keeps the most recent ones', () => {
    render(
      <ToastProvider>
        <Trigger count={5} />
      </ToastProvider>
    )
    act(() => {
      screen.getByText('Fire').click()
    })
    const items = screen.getAllByRole('status')
    expect(items).toHaveLength(3)
    expect(screen.getByText('Message 4')).toBeInTheDocument()
    expect(screen.queryByText('Message 0')).not.toBeInTheDocument()
  })

  it('shows a dismiss all button only when more than one toast is visible', () => {
    render(
      <ToastProvider>
        <Trigger count={1} />
      </ToastProvider>
    )
    act(() => {
      screen.getByText('Fire').click()
    })
    expect(screen.queryByText('Dismiss all')).not.toBeInTheDocument()
  })

  it('dismiss all clears every visible toast', () => {
    render(
      <ToastProvider>
        <Trigger count={3} />
      </ToastProvider>
    )
    act(() => {
      screen.getByText('Fire').click()
    })
    expect(screen.getAllByRole('status')).toHaveLength(3)
    act(() => {
      screen.getByText('Dismiss all').click()
    })
    expect(screen.queryAllByRole('status')).toHaveLength(0)
  })
})

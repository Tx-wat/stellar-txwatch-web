// @vitest-environment jsdom
/**
 * CopyButton.test.tsx
 *
 * Tests covering clipboard copy, rapid-click timer reset, and 2-second state reset.
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CopyButton from '@/components/CopyButton'

// Mock clipboard API
const writeText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
})

describe('CopyButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    writeText.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders in default (not copied) state', () => {
    render(<CopyButton text="hello" />)
    const btn = screen.getByRole('button', { name: /copy to clipboard/i })
    expect(btn).toBeInTheDocument()
    // No checkmark SVG in default state — the copy icon path is present
    expect(btn.querySelector('path[d*="M8 16"]')).toBeTruthy()
  })

  it('shows copied icon after a click', async () => {
    render(<CopyButton text="hello" />)
    const btn = screen.getByRole('button')
    await act(async () => { fireEvent.click(btn) })
    // Checkmark path appears
    expect(btn.querySelector('path[d*="M5 13"]')).toBeTruthy()
  })

  it('resets to default state after 2 seconds', async () => {
    render(<CopyButton text="hello" />)
    const btn = screen.getByRole('button')
    await act(async () => { fireEvent.click(btn) })
    act(() => { vi.advanceTimersByTime(2000) })
    expect(btn.querySelector('path[d*="M8 16"]')).toBeTruthy()
  })

  it('rapid clicks reset the timer — still shows copied icon just before 2s from last click', async () => {
    render(<CopyButton text="hello" />)
    const btn = screen.getByRole('button')

    // First click
    await act(async () => { fireEvent.click(btn) })
    // Advance 1500ms (before 2s resets)
    act(() => { vi.advanceTimersByTime(1500) })
    // Second click resets timer
    await act(async () => { fireEvent.click(btn) })
    // Advance another 1500ms (1500ms after last click, before the new 2s timer expires)
    act(() => { vi.advanceTimersByTime(1500) })
    // Should still be in copied state
    expect(btn.querySelector('path[d*="M5 13"]')).toBeTruthy()
  })

  it('rapid clicks: resets after 2s from last click', async () => {
    render(<CopyButton text="hello" />)
    const btn = screen.getByRole('button')

    await act(async () => { fireEvent.click(btn) })
    act(() => { vi.advanceTimersByTime(1500) })
    await act(async () => { fireEvent.click(btn) })
    // Advance exactly 2 seconds from the second click
    act(() => { vi.advanceTimersByTime(2000) })
    expect(btn.querySelector('path[d*="M8 16"]')).toBeTruthy()
  })

  it('calls clipboard writeText with the provided text', async () => {
    render(<CopyButton text="copy-me" />)
    await act(async () => { fireEvent.click(screen.getByRole('button')) })
    expect(writeText).toHaveBeenCalledWith('copy-me')
  })
})

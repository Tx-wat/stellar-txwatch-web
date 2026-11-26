// @vitest-environment jsdom
/**
 * ThemeToggle.test.tsx
 *
 * Tests for the dark/light theme toggle (issue #579).
 * Covers: initial dark default, toggling to light, persisting to
 * localStorage, aria-label updates, and <html> class toggling.
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ThemeProvider, { useTheme } from '@/components/ThemeProvider'
import ThemeToggle from '@/components/ThemeToggle'

// jsdom doesn't implement window.matchMedia — provide a minimal stub.
function setupMatchMedia(prefersDark = true) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersDark ? !query.includes('light') : query.includes('light'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

beforeEach(() => {
  setupMatchMedia(true) // OS default: dark
  localStorage.clear()
  document.documentElement.classList.add('dark')
})

afterEach(() => {
  localStorage.clear()
  document.documentElement.classList.add('dark')
  vi.restoreAllMocks()
})

describe('ThemeToggle', () => {
  it('renders with aria-label "Switch to light theme" when in dark mode', async () => {
    await act(async () => {
      render(
        <Wrapper>
          <ThemeToggle />
        </Wrapper>
      )
    })
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light theme')
  })

  it('toggles aria-label after clicking once', async () => {
    await act(async () => {
      render(
        <Wrapper>
          <ThemeToggle />
        </Wrapper>
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark theme')
  })

  it('removes the "dark" class from <html> after toggling to light', async () => {
    await act(async () => {
      render(
        <Wrapper>
          <ThemeToggle />
        </Wrapper>
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('restores the "dark" class after toggling back to dark', async () => {
    await act(async () => {
      render(
        <Wrapper>
          <ThemeToggle />
        </Wrapper>
      )
    })
    const btn = screen.getByRole('button')
    await act(async () => { fireEvent.click(btn) }) // dark → light
    await act(async () => { fireEvent.click(btn) }) // light → dark
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists the chosen theme to localStorage', async () => {
    await act(async () => {
      render(
        <Wrapper>
          <ThemeToggle />
        </Wrapper>
      )
    })
    await act(async () => { fireEvent.click(screen.getByRole('button')) }) // → light
    expect(localStorage.getItem('txwatch_theme')).toBe('light')
    await act(async () => { fireEvent.click(screen.getByRole('button')) }) // → dark
    expect(localStorage.getItem('txwatch_theme')).toBe('dark')
  })

  it('reads an existing "light" preference from localStorage on mount', async () => {
    localStorage.setItem('txwatch_theme', 'light')
    await act(async () => {
      render(
        <Wrapper>
          <ThemeToggle />
        </Wrapper>
      )
    })
    // After mount the button should reflect the stored preference
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark theme')
  })
})

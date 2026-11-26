// @vitest-environment jsdom
/**
 * Dashboard API mode indicator (issue #639).
 */
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ApiModeBadge, { getApiMode } from '@/components/ApiModeBadge'

const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL

describe('ApiModeBadge', () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL
    vi.resetModules()
  })

  it('shows "Local" when no API URL is configured', () => {
    process.env.NEXT_PUBLIC_API_URL = ''
    expect(getApiMode().isApiMode).toBe(false)
    render(<ApiModeBadge />)
    expect(screen.getByText('Local')).toBeInTheDocument()
  })

  it('shows "API Connected" and the URL in a tooltip when configured', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
    render(<ApiModeBadge />)
    const badge = screen.getByText('API Connected')
    expect(badge).toBeInTheDocument()
    fireEvent.focus(badge)
    expect(screen.getByText('https://api.example.com')).toBeInTheDocument()
  })
})

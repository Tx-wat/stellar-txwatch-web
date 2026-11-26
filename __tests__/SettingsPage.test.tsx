// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/lib/storage', () => ({
  getApiKey: vi.fn(() => ''),
  setApiKey: vi.fn(),
  clearApiKey: vi.fn(),
  testApiConnection: vi.fn(),
  getSettings: vi.fn(() => ({ explorer: 'stellar-expert', soundNotification: false })),
  saveSettings: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  testApiConnection: vi.fn(),
}))

import SettingsPage from '@/app/settings/page'
import { saveSettings } from '@/lib/storage'

describe('SettingsPage sound notification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the sound notification toggle', () => {
    render(<SettingsPage />)
    expect(screen.getByLabelText('Enable sound notifications')).toBeInTheDocument()
  })

  it('calls saveSettings when toggle is changed', () => {
    render(<SettingsPage />)
    const checkbox = screen.getByLabelText('Enable sound notifications')
    fireEvent.click(checkbox)
    expect(saveSettings).toHaveBeenCalledWith({ soundNotification: true })
  })
})

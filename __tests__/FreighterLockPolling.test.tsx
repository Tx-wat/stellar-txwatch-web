// @vitest-environment jsdom
/**
 * Freighter lock detection via periodic polling (issue #583).
 */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Networks } from '@stellar/stellar-sdk'
import FreighterConnect from '@/components/FreighterConnect'
import WalletStatusBadge from '@/components/WalletStatusBadge'
import { STORAGE_KEYS } from '@/lib/storageKeys'

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getPublicKey: vi.fn(),
  getNetworkDetails: vi.fn(),
  signTransaction: vi.fn(),
}))

const MOCK_PUBLIC_KEY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

function setFreighterState(locked: boolean) {
  window.freighter = {
    isConnected: vi.fn().mockResolvedValue(true),
    getPublicKey: locked
      ? vi.fn().mockRejectedValue(new Error('Freighter is locked'))
      : vi.fn().mockResolvedValue(MOCK_PUBLIC_KEY),
    getNetworkDetails: vi.fn().mockResolvedValue({ networkPassphrase: Networks.TESTNET }),
  }
}

describe('Freighter lock polling (#583)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    delete window.freighter
    setFreighterState(false)
  })

  afterEach(() => {
    delete window.freighter
    localStorage.clear()
  })

  it('detects a locked wallet on the next poll and updates both consumers', async () => {
    render(
      <>
        <FreighterConnect pollIntervalMs={20} />
        <WalletStatusBadge pollIntervalMs={20} />
      </>
    )

    await waitFor(() => {
      expect(screen.getByText(/GAAA…AAAA/)).toBeInTheDocument()
    })
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(localStorage.getItem(STORAGE_KEYS.FREIGHTER_PUBLIC_KEY)).toBe(MOCK_PUBLIC_KEY)

    // The user locks the extension; Freighter no longer returns a public key.
    setFreighterState(true)

    await waitFor(
      () => {
        expect(screen.getByText('Locked')).toBeInTheDocument()
        expect(screen.queryByText(/GAAA…AAAA/)).not.toBeInTheDocument()
        expect(screen.getByText(/Wallet is locked/)).toBeInTheDocument()
      },
      { timeout: 2000 }
    )

    expect(localStorage.getItem(STORAGE_KEYS.FREIGHTER_PUBLIC_KEY)).toBeNull()
  })

  it('recovers when the wallet is unlocked again', async () => {
    render(
      <>
        <FreighterConnect pollIntervalMs={20} />
        <WalletStatusBadge pollIntervalMs={20} />
      </>
    )

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    setFreighterState(true)
    await waitFor(() => {
      expect(screen.getByText('Locked')).toBeInTheDocument()
    })

    setFreighterState(false)
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
      expect(screen.getByText(/GAAA…AAAA/)).toBeInTheDocument()
    })
  })
})

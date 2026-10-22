import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Networks } from '@stellar/stellar-sdk'
import FreighterConnect from '@/components/FreighterConnect'
import {
  isConnected,
  requestAccess,
  getPublicKey,
} from '@stellar/freighter-api'

jest.mock('@stellar/freighter-api', () => ({
  isConnected: jest.fn(),
  requestAccess: jest.fn(),
  getPublicKey: jest.fn(),
  getNetworkDetails: jest.fn(),
  signTransaction: jest.fn(),
}))

const mockIsConnected = isConnected as jest.MockedFunction<typeof isConnected>
const mockRequestAccess = requestAccess as jest.MockedFunction<typeof requestAccess>
const mockGetPublicKey = getPublicKey as jest.MockedFunction<typeof getPublicKey>

const MOCK_PUBLIC_KEY = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

describe('FreighterConnect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsConnected.mockResolvedValue(true)
    mockRequestAccess.mockResolvedValue(MOCK_PUBLIC_KEY)
    mockGetPublicKey.mockResolvedValue(MOCK_PUBLIC_KEY)
  })

  describe('connection states', () => {
    it('renders connect button when not connected', () => {
      render(<FreighterConnect />)
      expect(screen.getByText('Connect Freighter')).toBeInTheDocument()
    })

    it('renders connected state with public key', async () => {
      render(<FreighterConnect />)

      await waitFor(() => {
        expect(screen.getByText(/GAAA…AAAA/)).toBeInTheDocument()
      })
    })

    it('shows disconnect button when connected', async () => {
      render(<FreighterConnect />)

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument()
      })
    })

    it('disconnects when disconnect button is clicked', async () => {
      render(<FreighterConnect />)

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Disconnect'))

      await waitFor(() => {
        expect(screen.getByText('Connect Freighter')).toBeInTheDocument()
      })
    })
  })

  describe('rejection handling', () => {
    it('shows error when user rejects connection', async () => {
      mockIsConnected.mockResolvedValue(false)
      mockRequestAccess.mockRejectedValue(new Error('User rejected'))

      render(<FreighterConnect />)

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(screen.getByText('Connection rejected')).toBeInTheDocument()
      })
    })

    it('shows not-allowed error when access is denied', async () => {
      mockIsConnected.mockResolvedValue(false)
      mockRequestAccess.mockRejectedValue(new Error('User denied access'))

      render(<FreighterConnect />)

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(screen.getByText(/not allowed/i)).toBeInTheDocument()
      })
    })

    it('shows locked error when wallet is locked', async () => {
      mockIsConnected.mockResolvedValue(false)
      mockRequestAccess.mockRejectedValue(new Error('Wallet is locked'))

      render(<FreighterConnect />)

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(screen.getByText(/locked/i)).toBeInTheDocument()
      })
    })

    it('clears error when user tries again', async () => {
      mockIsConnected.mockResolvedValue(false)
      mockRequestAccess
        .mockRejectedValueOnce(new Error('User rejected'))
        .mockResolvedValueOnce(MOCK_PUBLIC_KEY)

      render(<FreighterConnect />)

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(screen.getByText('Connection rejected')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(screen.queryByText('Connection rejected')).not.toBeInTheDocument()
      })
    })
  })

  describe('unavailable extension', () => {
    it('shows error when extension is not installed', async () => {
      mockIsConnected.mockResolvedValue(false)
      mockRequestAccess.mockRejectedValue(new Error('Freighter is not installed'))

      render(<FreighterConnect />)

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(screen.getByText(/Freighter not installed/)).toBeInTheDocument()
      })
    })

    it('opens Freighter website when extension is not installed', async () => {
      mockIsConnected.mockResolvedValue(false)
      mockRequestAccess.mockRejectedValue(new Error('Freighter is not installed'))
      const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation()

      render(<FreighterConnect />)

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith('https://www.freighter.app/', '_blank')
      })

      windowOpenSpy.mockRestore()
    })
  })

  describe('callbacks', () => {
    it('calls onConnect callback when connection succeeds', async () => {
      const onConnect = jest.fn()
      mockIsConnected.mockResolvedValue(false)

      render(<FreighterConnect onConnect={onConnect} />)

      fireEvent.click(screen.getByText('Connect Freighter'))

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledWith(MOCK_PUBLIC_KEY)
      })
    })

    it('calls onConnect callback on initial mount if already connected', async () => {
      const onConnect = jest.fn()

      render(<FreighterConnect onConnect={onConnect} />)

      await waitFor(() => {
        expect(onConnect).toHaveBeenCalledWith(MOCK_PUBLIC_KEY)
      })
    })
  })

  describe('network mismatch detection', () => {
    const mockPublicKey = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

    const setupFreighter = (networkPassphrase: string) => {
      ;(window as any).freighter = {
        isConnected: jest.fn().mockResolvedValue(true),
        getPublicKey: jest.fn().mockResolvedValue(mockPublicKey),
        getNetworkDetails: jest.fn().mockResolvedValue({
          network: 'CUSTOM',
          networkPassphrase,
          networkUrl: 'https://example.com',
        }),
      }
    }

    it('does not warn when wallet is on the public network', async () => {
      setupFreighter(Networks.PUBLIC)

      render(<FreighterConnect />)

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Wallet is on/)).not.toBeInTheDocument()
    })

    it('does not warn when wallet is on the testnet network', async () => {
      setupFreighter(Networks.TESTNET)

      render(<FreighterConnect />)

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Wallet is on/)).not.toBeInTheDocument()
    })

    it('does not warn when wallet is on the futurenet network', async () => {
      setupFreighter(Networks.FUTURENET)

      render(<FreighterConnect />)

      await waitFor(() => {
        expect(screen.getByText('Disconnect')).toBeInTheDocument()
      })

      expect(screen.queryByText(/Wallet is on/)).not.toBeInTheDocument()
    })

    it('shows custom network warning for an unknown passphrase', async () => {
      setupFreighter('Custom Network ; 2024')

      render(<FreighterConnect />)

      await waitFor(() => {
        expect(screen.getByText('Wallet is on a custom network')).toBeInTheDocument()
      })
    })
  })

  describe('loading state', () => {
    it('disables button while connecting', async () => {
      mockIsConnected.mockResolvedValue(false)
      mockRequestAccess.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(MOCK_PUBLIC_KEY), 100))
      )

      render(<FreighterConnect />)

      const button = screen.getByText('Connect Freighter')
      fireEvent.click(button)

      await waitFor(() => {
        expect(button).toBeDisabled()
      })
    })
  })
})

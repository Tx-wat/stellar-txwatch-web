import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import ContractDetail from '@/app/contracts/[id]/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/lib/storage', () => ({
  getContract: () => ({
    id: 'CABC',
    label: 'Test Contract',
    contract_id: 'CABC',
    network: 'testnet',
    rules: [],
    webhook_url: 'https://example.com/webhook',
    created_at: Date.UTC(2024, 0, 1),
    updated_at: Date.UTC(2024, 0, 1),
  }),
  getAlerts: () => [],
  saveContract: vi.fn(),
  deleteContract: vi.fn(),
  restoreContract: vi.fn(),
  addAlert: vi.fn(),
  getDailyAlertCounts: () => [],
  getApiKey: () => null,
  setApiKey: vi.fn(),
  clearApiKey: vi.fn(),
}))

const LEDGERS_PER_DAY = 17280

function mockContract(liveUntilLedgerSeq: number) {
  return {
    id: 'CABC',
    liveUntilLedgerSeq,
    latestLedger: 1000,
  }
}

describe('ContractDetail TTL display', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('shows liveUntilLedgerSeq and estimated expiry', async () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 60
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    expect(await screen.findByText(String(liveUntilLedgerSeq))).toBeInTheDocument()
    expect(await screen.findByText(/estimated/i)).toBeInTheDocument()
  })

  it('shows amber warning under 30 days', async () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 20
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    const warning = await screen.findByText(/expires in under/i)
    expect(warning).toHaveClass('amber')
  })

  it('shows red warning under 7 days', async () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 3
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    const warning = await screen.findByText(/expires in under/i)
    expect(warning).toHaveClass('red')
  })

  it('shows no warning when far from expiry', async () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 365
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    expect(screen.queryByText(/expires in under/i)).not.toBeInTheDocument()
  })
})

describe('Soroban RPC URL configuration and fallback', () => {
  it('defaults to keyless public endpoint for mainnet', async () => {
    const { SOROBAN_RPC_URLS, getSorobanRpcUrl } = await import('@/lib/stellar')
    expect(SOROBAN_RPC_URLS.mainnet).toBe('https://mainnet.sorobanrpc.com')
    expect(getSorobanRpcUrl('mainnet')).toBe('https://mainnet.sorobanrpc.com')
  })
})



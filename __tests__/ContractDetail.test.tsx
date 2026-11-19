import { render, screen } from '@testing-library/react'
import ContractDetail from '@/app/contracts/[id]/page'

const DAYS = 24 * 60 * 60 * 1000
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

  it('shows liveUntilLedgerSeq and estimated expiry', () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 60
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    expect(screen.getByText(String(liveUntilLedgerSeq))).toBeInTheDocument()
    expect(screen.getByText(/estimated/i)).toBeInTheDocument()
  })

  it('shows amber warning under 30 days', async () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 20
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    const warning = await screen.findByText(/expir/i)
    expect(warning).toHaveClass('amber')
  })

  it('shows red warning under 7 days', async () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 3
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    const warning = await screen.findByText(/expir/i)
    expect(warning).toHaveClass('red')
  })

  it('shows no warning when far from expiry', async () => {
    const liveUntilLedgerSeq = 1000 + LEDGERS_PER_DAY * 365
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockContract(liveUntilLedgerSeq),
    } as Response)

    render(<ContractDetail params={{ id: 'CABC' }} />)

    expect(screen.queryByText(/expir/i)).not.toBeInTheDocument()
  })
})

describe('Soroban RPC URL configuration and fallback', () => {
  it('defaults to keyless public endpoint for mainnet', async () => {
    const { SOROBAN_RPC_URLS, getSorobanRpcUrl } = await import('@/lib/stellar')
    expect(SOROBAN_RPC_URLS.mainnet).toBe('https://mainnet.sorobanrpc.com')
    expect(getSorobanRpcUrl('mainnet')).toBe('https://mainnet.sorobanrpc.com')
  })
})



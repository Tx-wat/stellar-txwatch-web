import {
  isValidContractId,
  truncateId,
  isValidUrl,
  explorerTxUrl,
  explorerContractUrl,
  STELLAR_EXPERT_BASE,
} from '@/lib/stellar'
import { Network } from '@/types'

describe('isValidContractId', () => {
  it('accepts valid C-addresses', () => {
    expect(isValidContractId('C' + 'A'.repeat(55))).toBe(true)
    expect(isValidContractId('C' + 'B'.repeat(55))).toBe(true)
    const mixed =
      'C' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567' + 'ABCDEFGHIJKLMNOPQRSTUVW'
    expect(mixed.length).toBe(56)
    expect(isValidContractId(mixed)).toBe(true)
  })

  it('rejects G-addresses', () => {
    expect(isValidContractId('G' + 'A'.repeat(55))).toBe(false)
  })

  it('rejects wrong prefix', () => {
    expect(isValidContractId('GBCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX')).toBe(
      false
    )
  })

  it('rejects wrong length', () => {
    expect(isValidContractId('CBCDEF')).toBe(false)
    expect(isValidContractId('C' + 'A'.repeat(54))).toBe(false)
    expect(isValidContractId('C' + 'A'.repeat(56))).toBe(false)
  })

  it('rejects lowercase input', () => {
    expect(isValidContractId('c' + 'a'.repeat(55))).toBe(false)
  })

  it('rejects invalid characters', () => {
    expect(isValidContractId('C' + 'A'.repeat(54) + '!')).toBe(false)
    expect(isValidContractId('C' + 'A'.repeat(54) + '0')).toBe(false)
    expect(isValidContractId('C' + 'A'.repeat(54) + '1')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidContractId('')).toBe(false)
  })
})

describe('truncateId', () => {
  it('returns a short id unchanged', () => {
    expect(truncateId('abc')).toBe('abc')
    expect(truncateId('CABC1234')).toBe('CABC1234')
  })

  it('does not truncate at the exact boundary (chars * 2 + 3)', () => {
    const boundary = 'a'.repeat(8 * 2 + 3)
    expect(truncateId(boundary)).toBe(boundary)
    expect(truncateId(boundary).length).toBe(19)
  })

  it('truncates an id one character over the boundary', () => {
    const id = 'a'.repeat(20)
    expect(truncateId(id)).toBe(`${id.slice(0, 8)}...${id.slice(-8)}`)
  })

  it('truncates a long id in the middle', () => {
    const id = 'C' + 'B'.repeat(55)
    expect(truncateId(id)).toBe(`${id.slice(0, 8)}...${id.slice(-8)}`)
    expect(truncateId(id)).toContain('...')
  })

  it('honours a custom chars value', () => {
    const id = 'a'.repeat(4 * 2 + 3)
    expect(truncateId(id, 4)).toBe(id)

    const longer = 'a'.repeat(12)
    expect(truncateId(longer, 4)).toBe(`${longer.slice(0, 4)}...${longer.slice(-4)}`)
  })
})

describe('isValidUrl', () => {
  it('accepts http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true)
  })

  it('accepts https URLs', () => {
    expect(isValidUrl('https://example.com/webhook')).toBe(true)
  })

  it('rejects ftp URLs', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidUrl('')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isValidUrl('not a url at all')).toBe(false)
    expect(isValidUrl('example.com')).toBe(false)
    expect(isValidUrl('https://')).toBe(false)
  })
})

describe('explorer URLs', () => {
  const cases: Array<{ network: Network; segment: string }> = [
    { network: 'mainnet', segment: 'public' },
    { network: 'testnet', segment: 'testnet' },
    { network: 'futurenet', segment: 'futurenet' },
  ]

  for (const { network, segment } of cases) {
    it(`maps ${network} to the "${segment}" tx segment`, () => {
      expect(explorerTxUrl(network, 'txhash')).toBe(
        `${STELLAR_EXPERT_BASE}/${segment}/tx/txhash`
      )
    })

    it(`maps ${network} to the "${segment}" contract segment`, () => {
      const contractId = 'C' + 'A'.repeat(55)
      expect(explorerContractUrl(network, contractId)).toBe(
        `${STELLAR_EXPERT_BASE}/${segment}/contract/${contractId}`
      )
    })
  }

  it('keeps testnet/futurenet names and renames only mainnet', () => {
    expect(explorerTxUrl('mainnet', 'h')).toContain('/public/')
    expect(explorerTxUrl('testnet', 'h')).toContain('/testnet/')
    expect(explorerTxUrl('futurenet', 'h')).toContain('/futurenet/')
  })
})

// ---------------------------------------------------------------------------
// Soroban RPC helper tests
// ---------------------------------------------------------------------------

const mockScValToNative = jest.fn((val: unknown) => val)

jest.mock('@stellar/stellar-sdk', () => {
  const actual = jest.requireActual('@stellar/stellar-sdk')
  return {
    ...actual,
    scValToNative: (val: unknown) => mockScValToNative(val),
  }
})

// Imported after the mock so the helpers pick up the mocked scValToNative.
import {
  checkContractExists,
  fetchContractMetadata,
  fetchContractEvents,
} from '@/lib/stellar'

const CONTRACT_ID = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7'

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('checkContractExists', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('returns exists true when an entry is present', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        result: {
          entries: [{ key: 'instance', xdr: 'AAAA' }],
          latestLedger: 1234,
        },
      })
    ) as unknown as typeof fetch

    const result = await checkContractExists(CONTRACT_ID, 'testnet')

    expect(result.exists).toBe(true)
    expect(result.error).toBeUndefined()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns exists false when the entry is null', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        result: {
          entries: null,
          latestLedger: 1234,
        },
      })
    ) as unknown as typeof fetch

    const result = await checkContractExists(CONTRACT_ID, 'testnet')

    expect(result.exists).toBe(false)
    expect(result.error).toBeUndefined()
  })

  it('surfaces an error when the RPC responds with an error', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          error: { code: -32600, message: 'Invalid request' },
        },
        true,
        200
      )
    ) as unknown as typeof fetch

    const result = await checkContractExists(CONTRACT_ID, 'testnet')

    expect(result.exists).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns a non-throwing error result when fetch rejects', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('network down')) as unknown as typeof fetch

    const result = await checkContractExists(CONTRACT_ID, 'testnet')

    expect(result.exists).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('fetchContractMetadata', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
    mockScValToNative.mockClear()
  })

  it('returns isSac true for SAC executables', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        result: {
          entries: [
            {
              key: 'instance',
              xdr: 'AAAA',
              lastModifiedLedgerSeq: 42,
              val: {
                contractData: {
                  val: {
                    executable: { sac: {} },
                  },
                },
              },
            },
          ],
          latestLedger: 100,
        },
      })
    ) as unknown as typeof fetch

    const metadata = await fetchContractMetadata(CONTRACT_ID, 'testnet')

    expect(metadata).toBeDefined()
    expect(metadata?.isSac).toBe(true)
    expect(metadata?.wasmHash).toBeUndefined()
  })

  it('returns a wasm hash for wasm executables', async () => {
    const wasmHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'

    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        result: {
          entries: [
            {
              key: 'instance',
              xdr: 'AAAA',
              lastModifiedLedgerSeq: 77,
              val: {
                contractData: {
                  val: {
                    executable: { wasm: wasmHash },
                  },
                },
              },
            },
          ],
          latestLedger: 100,
        },
      })
    ) as unknown as typeof fetch

    const metadata = await fetchContractMetadata(CONTRACT_ID, 'testnet')

    expect(metadata).toBeDefined()
    expect(metadata?.isSac).toBe(false)
    expect(metadata?.wasmHash).toBe(wasmHash)
    expect(metadata?.lastModifiedLedger).toBe(77)
  })
})

describe('fetchContractEvents', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
    mockScValToNative.mockClear()
  })

  it('builds a startLedger within retention and decodes topics via scValToNative', async () => {
    const latestLedger = 5000
    const retentionWindow = 1000

    mockScValToNative.mockImplementation((val: unknown) => {
      if (val === 'topic-xdr') return 'transfer'
      return val
    })

    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        result: {
          events: [
            {
              type: 'contract',
              ledger: 4990,
              txHash: 'deadbeef',
              topic: ['topic-xdr'],
              value: 'value-xdr',
            },
          ],
          latestLedger,
        },
      })
    ) as unknown as typeof fetch

    const events = await fetchContractEvents(CONTRACT_ID, 'testnet')

    expect(global.fetch).toHaveBeenCalledTimes(1)

    const [, init] = (global.fetch as jest.Mock).mock.calls[0]
    const body = JSON.parse(init.body)
    const startLedger = body.params.startLedger

    expect(typeof startLedger).toBe('number')
    expect(startLedger).toBeGreaterThan(0)
    expect(startLedger).toBeLessThanOrEqual(latestLedger)
    expect(latestLedger - startLedger).toBeLessThanOrEqual(retentionWindow)

    expect(mockScValToNative).toHaveBeenCalled()
    expect(events).toHaveLength(1)
    expect(events[0].topics).toContain('transfer')
  })
})
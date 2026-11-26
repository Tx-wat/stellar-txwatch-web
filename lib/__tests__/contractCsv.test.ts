import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StrKey } from '@stellar/stellar-sdk'
import { WatchedContract } from '@/types'
import { parseCsvLine, importContractsFromCsv, contractKey } from '../contractCsv'

const { saveContract, getContracts } = vi.hoisted(() => ({
  saveContract: vi.fn(),
  getContracts: vi.fn<[], WatchedContract[]>(() => []),
}))

vi.mock('@/lib/storage', () => ({ saveContract, getContracts }))

function contractId(seed: number): string {
  return StrKey.encodeContract(Buffer.alloc(32, seed))
}

const idA = contractId(1)
const idB = contractId(2)
const HEADER = 'contract_id,label,network,webhook_url'

beforeEach(() => {
  saveContract.mockClear()
  getContracts.mockReturnValue([])
})

describe('parseCsvLine', () => {
  it('splits plain cells and trims whitespace', () => {
    expect(parseCsvLine(' a , b ,c ')).toEqual(['a', 'b', 'c'])
  })

  it('supports quoted cells containing commas', () => {
    expect(parseCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd'])
  })

  it('unescapes doubled quotes inside quoted cells', () => {
    expect(parseCsvLine('"say ""hi""",x')).toEqual(['say "hi"', 'x'])
  })
})

describe('importContractsFromCsv', () => {
  it('imports every valid row in a CSV with a header', () => {
    const csv = [
      HEADER,
      `${idA},Alpha,testnet,https://a.example/hook`,
      `${idB},Beta,mainnet,https://b.example/hook`,
    ].join('\n')
    const result = importContractsFromCsv(csv)

    expect(result).toEqual({ imported: 2, skipped: 0, errors: [] })
    expect(saveContract).toHaveBeenCalledTimes(2)
    expect(saveContract.mock.calls[0][0]).toMatchObject({
      contract_id: idA,
      label: 'Alpha',
      network: 'testnet',
      rules: [],
    })
  })

  it('imports headerless rows in column order', () => {
    const result = importContractsFromCsv(`${idA},Alpha,testnet,https://a.example/hook`)

    expect(result.imported).toBe(1)
    expect(saveContract).toHaveBeenCalledTimes(1)
  })

  it('skips contracts already registered for the same network', () => {
    getContracts.mockReturnValue([
      {
        id: 'existing',
        label: 'Existing',
        contract_id: idA,
        network: 'testnet',
        rules: [],
        webhook_url: 'https://a.example/hook',
        created_at: 0,
        updated_at: 0,
      },
    ])

    const result = importContractsFromCsv(`${HEADER}\n${idA},Alpha,testnet,https://a.example/hook`)

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(1)
    expect(result.errors[0].message).toBe('duplicate contract already registered')
    expect(saveContract).not.toHaveBeenCalled()
  })

  it('allows the same contract id on a different network', () => {
    getContracts.mockReturnValue([
      {
        id: 'existing',
        label: 'Existing',
        contract_id: idA,
        network: 'testnet',
        rules: [],
        webhook_url: 'https://a.example/hook',
        created_at: 0,
        updated_at: 0,
      },
    ])

    const result = importContractsFromCsv(`${HEADER}\n${idA},Alpha,mainnet,https://a.example/hook`)

    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(0)
  })

  it('skips duplicates that appear twice within the same file', () => {
    const csv = [
      HEADER,
      `${idA},Alpha,testnet,https://a.example/hook`,
      `${idA},Alpha again,testnet,https://a.example/hook`,
    ].join('\n')
    const result = importContractsFromCsv(csv)

    expect(result.imported).toBe(1)
    expect(result.skipped).toBe(1)
    expect(result.errors).toEqual([{ line: 3, message: 'duplicate contract already registered' }])
    expect(saveContract).toHaveBeenCalledTimes(1)
  })

  it('reports row validation errors without saving', () => {
    const csv = [
      HEADER,
      `${idA},,testnet,https://a.example/hook`,
      'not-a-contract,Gamma,testnet,https://c.example/hook',
      `${idB},Delta,devnet,https://d.example/hook`,
      `${idB},Epsilon,testnet,not-a-url`,
    ].join('\n')

    const result = importContractsFromCsv(csv)

    expect(result.imported).toBe(0)
    expect(result.skipped).toBe(4)
    expect(result.errors.map((e) => e.line)).toEqual([2, 3, 4, 5])
    expect(result.errors[0].message).toContain('label is required')
    expect(result.errors[1].message).toContain('invalid contract_id')
    expect(result.errors[2].message).toContain('invalid network')
    expect(result.errors[3].message).toContain('invalid webhook_url')
    expect(saveContract).not.toHaveBeenCalled()
  })

  it('reports missing header columns', () => {
    const result = importContractsFromCsv('contract_id,label,network\nsome-id,Alpha,testnet')

    expect(result).toEqual({
      imported: 0,
      skipped: 0,
      errors: [{ line: 1, message: 'Missing column(s): webhook_url' }],
    })
  })

  it('returns an error for an empty file', () => {
    expect(importContractsFromCsv('   \n\n')).toEqual({
      imported: 0,
      skipped: 0,
      errors: [{ line: 0, message: 'CSV file is empty' }],
    })
  })
})

describe('contractKey', () => {
  it('combines contract id and network', () => {
    expect(contractKey('C123', 'mainnet')).toBe('C123:mainnet')
  })
})

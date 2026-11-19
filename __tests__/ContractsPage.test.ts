/**
 * Tests for pagination logic used in the contracts page (issue #80)
 * and responsive filter bar behaviour (issue #81).
 */

const PAGE_SIZE = 12

function paginate<T>(items: T[], page: number): T[] {
  return items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
}

function totalPages(count: number): number {
  return Math.max(1, Math.ceil(count / PAGE_SIZE))
}

describe('contracts page — pagination (issue #80)', () => {
  it('returns first PAGE_SIZE items on page 1', () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    expect(paginate(items, 1)).toHaveLength(PAGE_SIZE)
    expect(paginate(items, 1)[0]).toBe(0)
  })

  it('returns correct slice on page 2', () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    const result = paginate(items, 2)
    expect(result).toHaveLength(PAGE_SIZE)
    expect(result[0]).toBe(PAGE_SIZE)
  })

  it('returns remaining items on last page', () => {
    const items = Array.from({ length: 25 }, (_, i) => i)
    const result = paginate(items, 3)
    expect(result).toHaveLength(1)
    expect(result[0]).toBe(24)
  })

  it('totalPages is 1 for empty list', () => {
    expect(totalPages(0)).toBe(1)
  })

  it('totalPages is 1 when items fit on one page', () => {
    expect(totalPages(PAGE_SIZE)).toBe(1)
  })

  it('totalPages rounds up correctly', () => {
    expect(totalPages(PAGE_SIZE + 1)).toBe(2)
    expect(totalPages(PAGE_SIZE * 3)).toBe(3)
    expect(totalPages(PAGE_SIZE * 3 + 1)).toBe(4)
  })

  it('page 1 of a single-item list returns that item', () => {
    expect(paginate(['only'], 1)).toEqual(['only'])
  })
})

describe('contracts page — network filter (issue #81)', () => {
  type Item = { network: string }
  const items: Item[] = [
    { network: 'mainnet' },
    { network: 'mainnet' },
    { network: 'testnet' },
    { network: 'futurenet' },
  ]

  function applyFilter(list: Item[], filter: string): Item[] {
    if (filter === 'all') return list
    return list.filter((c) => c.network === filter)
  }

  it('all filter returns every item', () => {
    expect(applyFilter(items, 'all')).toHaveLength(4)
  })

  it('mainnet filter returns only mainnet items', () => {
    const result = applyFilter(items, 'mainnet')
    expect(result).toHaveLength(2)
    expect(result.every((c) => c.network === 'mainnet')).toBe(true)
  })

  it('testnet filter returns only testnet items', () => {
    const result = applyFilter(items, 'testnet')
    expect(result).toHaveLength(1)
    expect(result[0].network).toBe('testnet')
  })

  it('futurenet filter returns only futurenet items', () => {
    const result = applyFilter(items, 'futurenet')
    expect(result).toHaveLength(1)
    expect(result[0].network).toBe('futurenet')
  })

  it('filter with no matches returns empty array', () => {
    expect(applyFilter([], 'mainnet')).toHaveLength(0)
  })
})

describe('contracts page — search', () => {
  type ContractItem = { label: string; contract_id: string }
  const items: ContractItem[] = [
    { label: 'Escrow Manager', contract_id: 'ABC123' },
    { label: 'Payment Router', contract_id: 'DEF456' },
    { label: 'token service', contract_id: 'ghi789' },
  ]

  function applySearch(list: ContractItem[], query: string): ContractItem[] {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return list
    return list.filter((item) => {
      return (
        item.label.toLowerCase().includes(normalized) ||
        item.contract_id.toLowerCase().includes(normalized)
      )
    })
  }

  it('returns all contracts when search is empty', () => {
    expect(applySearch(items, '')).toHaveLength(3)
  })

  it('searches by label case-insensitively', () => {
    expect(applySearch(items, 'ESCROW')).toEqual([{ label: 'Escrow Manager', contract_id: 'ABC123' }])
  })

  it('searches by contract id substring', () => {
    expect(applySearch(items, '456')).toEqual([{ label: 'Payment Router', contract_id: 'DEF456' }])
  })

  it('returns no matches when search does not match any contract', () => {
    expect(applySearch(items, 'missing')).toHaveLength(0)
  })
})

describe('contracts page — missing contract detection (issue #411)', () => {
  type ContractItem = { contract_id: string; network: string }

  const RESETTABLE_NETWORKS = ['testnet', 'futurenet']

  function isResettableNetwork(network: string): boolean {
    return RESETTABLE_NETWORKS.includes(network)
  }

  function findMissingContractIds(
    list: ContractItem[],
    existence: Record<string, boolean>,
  ): string[] {
    return list
      .filter((c) => isResettableNetwork(c.network) && existence[c.contract_id] === false)
      .map((c) => c.contract_id)
  }

  function removeMissingContracts(
    list: ContractItem[],
    existence: Record<string, boolean>,
  ): ContractItem[] {
    const missing = new Set(findMissingContractIds(list, existence))
    return list.filter((c) => !missing.has(c.contract_id))
  }

  const items: ContractItem[] = [
    { contract_id: 'MAIN1', network: 'mainnet' },
    { contract_id: 'TEST1', network: 'testnet' },
    { contract_id: 'TEST2', network: 'testnet' },
    { contract_id: 'FUT1', network: 'futurenet' },
  ]

  it('flags testnet/futurenet contracts reported as missing', () => {
    const existence = { MAIN1: true, TEST1: false, TEST2: true, FUT1: false }
    expect(findMissingContractIds(items, existence).sort()).toEqual(['FUT1', 'TEST1'])
  })

  it('does not flag contracts whose existence is unknown or true', () => {
    const existence = { TEST1: true }
    expect(findMissingContractIds(items, existence)).toEqual([])
  })

  it('never flags mainnet contracts even when reported missing', () => {
    const existence = { MAIN1: false, TEST1: false, TEST2: false, FUT1: false }
    const missing = findMissingContractIds(items, existence)
    expect(missing).not.toContain('MAIN1')
    expect(missing.sort()).toEqual(['FUT1', 'TEST1', 'TEST2'])
  })

  it('returns empty array when there are no resettable contracts', () => {
    const mainnetOnly: ContractItem[] = [{ contract_id: 'MAIN1', network: 'mainnet' }]
    expect(findMissingContractIds(mainnetOnly, { MAIN1: false })).toEqual([])
  })

  it('remove missing contracts filters flagged items out of the list', () => {
    const existence = { MAIN1: false, TEST1: false, TEST2: true, FUT1: false }
    const result = removeMissingContracts(items, existence)
    expect(result.map((c) => c.contract_id).sort()).toEqual(['MAIN1', 'TEST2'])
  })

  it('remove missing contracts keeps the list intact when nothing is missing', () => {
    const existence = { MAIN1: true, TEST1: true, TEST2: true, FUT1: true }
    expect(removeMissingContracts(items, existence)).toEqual(items)
  })
})

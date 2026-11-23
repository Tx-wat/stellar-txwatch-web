import { sortContracts, sortByRuleCount, StoredContract } from '../contractSort';

const make = (id: string, label: string, network: string): StoredContract => ({
  id, address: `G${id}`, label, network,
});

const makeWithRules = (id: string, label: string, ruleCount: number): StoredContract & { rules: unknown[] } => ({
  id, address: `G${id}`, label, network: 'mainnet', rules: Array(ruleCount).fill({}),
});

describe('sortByRuleCount', () => {
  it('sorts contracts by descending rule count', () => {
    const input = [makeWithRules('1', 'Few', 1), makeWithRules('2', 'Many', 5), makeWithRules('3', 'None', 0)];
    const sorted = sortByRuleCount(input);
    expect(sorted.map((c) => c.label)).toEqual(['Many', 'Few', 'None']);
  });

  it('breaks ties by label when rule counts are equal', () => {
    const input = [makeWithRules('1', 'Zebra', 2), makeWithRules('2', 'Apple', 2)];
    const sorted = sortByRuleCount(input);
    expect(sorted.map((c) => c.label)).toEqual(['Apple', 'Zebra']);
  });
});

describe('sortContracts', () => {
  it('sorts mainnet before testnet', () => {
    const input = [make('2', 'Alpha', 'testnet'), make('1', 'Alpha', 'mainnet')];
    const sorted = sortContracts(input);
    expect(sorted[0].network).toBe('mainnet');
    expect(sorted[1].network).toBe('testnet');
  });

  it('sorts by label A–Z within same network', () => {
    const input = [make('2', 'Zebra', 'mainnet'), make('1', 'Apple', 'mainnet')];
    const sorted = sortContracts(input);
    expect(sorted[0].label).toBe('Apple');
    expect(sorted[1].label).toBe('Zebra');
  });

  it('label sort is case-insensitive', () => {
    const input = [make('2', 'beta', 'mainnet'), make('1', 'Alpha', 'mainnet')];
    const sorted = sortContracts(input);
    expect(sorted[0].label).toBe('Alpha');
  });

  it('uses id as tiebreaker for identical label + network', () => {
    const input = [make('z', 'Same', 'mainnet'), make('a', 'Same', 'mainnet')];
    const sorted = sortContracts(input);
    expect(sorted[0].id).toBe('a');
    expect(sorted[1].id).toBe('z');
  });

  it('does not mutate the input array', () => {
    const input = [make('2', 'B', 'mainnet'), make('1', 'A', 'mainnet')];
    const original = [...input];
    sortContracts(input);
    expect(input).toEqual(original);
  });

  it('returns empty array for empty input', () => {
    expect(sortContracts([])).toEqual([]);
  });

  it('returns single-element array unchanged', () => {
    const input = [make('1', 'Solo', 'mainnet')];
    expect(sortContracts(input)).toEqual(input);
  });

  it('is idempotent — sorting twice gives same result', () => {
    const input = [
      make('c', 'Charlie', 'testnet'),
      make('a', 'Alpha',   'mainnet'),
      make('b', 'Beta',    'mainnet'),
    ];
    const once  = sortContracts(input);
    const twice = sortContracts(once);
    expect(twice).toEqual(once);
  });
});

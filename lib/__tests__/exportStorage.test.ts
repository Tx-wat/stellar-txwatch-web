import {
  buildContractSnapshot,
  exportContractsAsJson,
  parseContractSnapshot,
  validateSnapshotContracts,
  restoreContractSnapshot,
} from '../exportStorage';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:   (key: string) => store[key] ?? null,
    setItem:   (key: string, value: string) => { store[key] = value; },
    removeItem:(key: string) => { delete store[key]; },
    clear:     () => { store = {}; },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Use the real contracts key (same as storage.ts)
const KEY = 'txwatch_contracts';
const sample = [
  {
    id: 'c1',
    label: 'Alpha',
    contract_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    network: 'mainnet',
    rules: [],
    webhook_url: 'https://example.com/hook1',
    created_at: 1000,
    updated_at: 1000,
  },
  {
    id: 'c2',
    label: 'Beta',
    contract_id: 'CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
    network: 'testnet',
    rules: [],
    webhook_url: 'https://example.com/hook2',
    created_at: 2000,
    updated_at: 2000,
  },
];
const sampleWithNotes = [
  { id: 'c1', address: 'GABC', label: 'Alpha', network: 'mainnet', notes: 'Owner: team-a\nRunbook: https://example.com/runbook' },
  { id: 'c2', address: 'GDEF', label: 'Beta',  network: 'testnet' },
];

beforeEach(() => localStorageMock.clear());

describe('buildContractSnapshot', () => {
  it('returns version 1 snapshot', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    expect(buildContractSnapshot(KEY).version).toBe(1);
  });

  it('includes all contracts', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const snap = buildContractSnapshot(KEY);
    expect(snap.count).toBe(2);
    expect(snap.contracts).toHaveLength(2);
  });

  it('returns count 0 and empty array when no contracts stored', () => {
    const snap = buildContractSnapshot(KEY);
    expect(snap.count).toBe(0);
    expect(snap.contracts).toEqual([]);
  });

  it('includes an ISO exportedAt timestamp', () => {
    const snap = buildContractSnapshot(KEY);
    expect(() => new Date(snap.exportedAt)).not.toThrow();
    expect(snap.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('includes the notes field in the snapshot', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleWithNotes));
    const snap = buildContractSnapshot(KEY);
    expect(snap.contracts[0].notes).toBe('Owner: team-a\nRunbook: https://example.com/runbook');
    expect(snap.contracts[1].notes).toBeUndefined();
  });
});

describe('exportContractsAsJson', () => {
  it('returns valid JSON string', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const json = exportContractsAsJson(KEY);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('produced JSON round-trips back to snapshot shape', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const json = exportContractsAsJson(KEY);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.contracts).toHaveLength(2);
  });

  it('includes notes in the exported JSON', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleWithNotes));
    const parsed = JSON.parse(exportContractsAsJson(KEY));
    expect(parsed.contracts[0].notes).toBe('Owner: team-a\nRunbook: https://example.com/runbook');
  });
});

describe('parseContractSnapshot', () => {
  it('parses valid snapshot JSON', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const json = exportContractsAsJson(KEY);
    const snap = parseContractSnapshot(json);
    expect(snap.version).toBe(1);
    expect(snap.contracts).toHaveLength(2);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseContractSnapshot('not json')).toThrow('Invalid JSON');
  });

  it('throws on wrong version', () => {
    const bad = JSON.stringify({ version: 99, contracts: [] });
    expect(() => parseContractSnapshot(bad)).toThrow('Invalid snapshot format');
  });

  it('throws when contracts field is missing', () => {
    const bad = JSON.stringify({ version: 1 });
    expect(() => parseContractSnapshot(bad)).toThrow('Invalid snapshot format');
  });

  it('round-trips the notes field through export and parse', () => {
    localStorage.setItem(KEY, JSON.stringify(sampleWithNotes));
    const snap = parseContractSnapshot(exportContractsAsJson(KEY));
    expect(snap.contracts[0].notes).toBe('Owner: team-a\nRunbook: https://example.com/runbook');
    expect(snap.contracts[1].notes).toBeUndefined();
  });
});

describe('validateSnapshotContracts', () => {
  it('returns empty array for valid contracts', () => {
    localStorage.setItem(KEY, JSON.stringify(sample));
    const snap = buildContractSnapshot(KEY);
    const errors = validateSnapshotContracts(snap);
    expect(errors).toHaveLength(0);
  });

  it('returns errors for missing required fields', () => {
    const badSnap = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      count: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contracts: [{ id: 'c1' }] as any,
    };
    const errors = validateSnapshotContracts(badSnap);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('label'))).toBe(true);
  });

  it('returns error for unknown network', () => {
    const badSnap = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      count: 1,
      contracts: [{
        id: 'c1', label: 'L', contract_id: 'CAAA', network: 'badnet' as 'mainnet',
        rules: [], webhook_url: 'https://x.com',
      }],
    };
    const errors = validateSnapshotContracts(badSnap);
    expect(errors.some(e => e.includes('network'))).toBe(true);
  });
});

describe('restoreContractSnapshot', () => {
  it('writes contracts to localStorage under the given key', () => {
    const snap = {
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      count: 1,
      contracts: [sample[0]],
    };
    restoreContractSnapshot(snap, KEY);
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('c1');
  });
});

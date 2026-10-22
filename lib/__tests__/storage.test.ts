import { vi } from 'vitest';
import {
  saveContract,
  deleteContract,
  restoreContract,
  getContracts,
  getContract,
  saveAlert,
  addAlert,
  getAlerts,
  deleteAlert,
  deleteAlerts,
  deleteAlertsByContractId,
  migrateStorage,
  getNetworkDistribution,
} from '../storage';
import { WatchedContract, AlertPayload, Network } from '@/types';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem:   (key: string) => store[key] ?? null,
    setItem:   (key: string, value: string) => { store[key] = value; },
    removeItem:(key: string) => { delete store[key]; },
    clear:     () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key:       (i: number) => Object.keys(store)[i] ?? null,
  };
})();

const CONTRACTS_KEY = 'txwatch_contracts';
const ALERTS_KEY = 'txwatch_alerts';
const VERSION_KEY = 'txwatch_storage_version';

function makeContract(overrides: Partial<WatchedContract> = {}): WatchedContract {
  return {
    id: 'c1',
    label: 'Test Contract',
    contract_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7',
    network: 'testnet',
    rules: [],
    webhook_url: '',
    created_at: 1000,
    updated_at: 1000,
    ...overrides,
  };
}

function makeAlert(overrides: Partial<AlertPayload> = {}): AlertPayload {
  return {
    label: 'Alert',
    contract_id: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7',
    network: 'testnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: 'tx',
    timestamp: Date.now(),
    horizon_link: 'https://horizon-testnet.stellar.org/transactions/tx',
    ...overrides,
  };
}

function readRaw<T>(key: string): T {
  return JSON.parse(localStorageMock.getItem(key) ?? '[]');
}

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

function makeContract(id: string, label: string, network: Network): WatchedContract {
  return {
    id,
    label,
    contract_id: `C-${id}`,
    network,
    rules: [],
    webhook_url: '',
    created_at: 0,
    updated_at: 0,
  };
}

function makeAlert(id: string, contractId: string): AlertPayload {
  return {
    id,
    label: `Alert ${id}`,
    contract_id: contractId,
    network: 'mainnet',
    rule_triggered: 'AnyTransaction',
    transaction_hash: `hash-${id}`,
    timestamp: Date.now(),
    horizon_link: `https://horizon.stellar.org/transactions/hash-${id}`,
  };
}

const contract1 = makeContract('c1', 'Contract Alpha', 'mainnet');
const contract2 = makeContract('c2', 'Contract Beta', 'testnet');

const alert1 = makeAlert('a1', 'c1');
const alert2 = makeAlert('a2', 'c1');
const alert3 = makeAlert('a3', 'c1');

beforeEach(() => {
  localStorageMock.clear();
  clearStorageErrorHandlers();
});

describe('saveContract / getContracts', () => {
  it('saves a contract and retrieves it', () => {
    saveContract(contract1);
    const contracts = getContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0].id).toBe('c1');
  });

  it('retrieves multiple saved contracts', () => {
    saveContract(contract1);
    saveContract(contract2);
    expect(getContracts()).toHaveLength(2);
  });

  it('returns empty array when no contracts saved (empty fallback)', () => {
    expect(getContracts()).toEqual([]);
  });
});

describe('contract notes', () => {
  it('saves and retrieves a contract with notes', () => {
    saveContract(contractWithNotes);
    const contracts = getContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0].notes).toBe(contractWithNotes.notes);
  });

  it('preserves line breaks in notes', () => {
    saveContract(contractWithNotes);
    expect(getContracts()[0].notes).toContain('\n');
  });

  it('saves a contract without notes (optional field)', () => {
    saveContract(contract1);
    const contracts = getContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0].notes).toBeUndefined();
  });

  it('updates notes when saving a duplicate id', () => {
    saveContract(contract1);
    saveContract({ ...contract1, notes: 'Updated notes' });
    const contracts = getContracts();
    expect(contracts).toHaveLength(1);
    expect(contracts[0].notes).toBe('Updated notes');
  });

  it('accepts notes of exactly 1000 characters', () => {
    const notes = 'a'.repeat(1000);
    saveContract({ ...contract1, notes });
    expect(getContracts()[0].notes).toBe(notes);
  });

  it('rejects or truncates notes longer than 1000 characters', () => {
    const notes = 'a'.repeat(1001);
    saveContract({ ...contract1, notes });
    const stored = getContracts()[0].notes;
    expect(stored === undefined || stored.length <= 1000).toBe(true);
  });
});

describe('deleteContract', () => {
  it('removes the correct contract by id', () => {
    saveContract(contract1);
    saveContract(contract2);
    deleteContract('c1');
    const remaining = getContracts();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('c2');
  });

  it('is a no-op when deleting a non-existent id', () => {
    saveContract(contract1);
    deleteContract('does-not-exist');
    expect(getContracts()).toHaveLength(1);
  });

  it('results in empty array after deleting the only contract', () => {
    saveContract(contract1);
    deleteContract('c1');
    expect(getContracts()).toEqual([]);
  });
});

describe('enabled flag defaults', () => {
  it('defaults enabled to true when saving a contract without the flag', () => {
    saveContract(contract1);
    expect(getContracts()[0].enabled).toBe(true);
  });

  it('preserves an explicit enabled: false on save', () => {
    saveContract({ ...contract1, enabled: false });
    expect(getContracts()[0].enabled).toBe(false);
  });

  it('migrates legacy stored contracts without enabled to enabled: true', () => {
    localStorageMock.setItem(
      'watched_contracts',
      JSON.stringify([{ ...contract1 }, { ...contract2, enabled: false }]),
    );
    const contracts = getContracts();
    expect(contracts).toHaveLength(2);
    expect(contracts[0].enabled).toBe(true);
    expect(contracts[1].enabled).toBe(false);
  });
});

describe('restoreContract', () => {
  it('restores a deleted contract exactly', () => {
    saveContract(contract1);
    saveContract(contract2);
    const snapshot = getContracts().find(c => c.id === 'c1');
    deleteContract('c1');
    restoreContract(snapshot);
    const restored = getContracts().find(c => c.id === 'c1');
    expect(restored).toEqual(snapshot);
    expect(getContracts()).toHaveLength(2);
  });

  it('restores a contract with enabled: false preserved', () => {
    saveContract({ ...contract1, enabled: false });
    const snapshot = getContracts()[0];
    deleteContract('c1');
    restoreContract(snapshot);
    expect(getContracts()[0].enabled).toBe(false);
  });

  it('restores multiple contracts for bulk undo', () => {
    saveContract(contract1);
    saveContract(contract2);
    const snapshots = getContracts();
    deleteContract('c1');
    deleteContract('c2');
    expect(getContracts()).toEqual([]);
    snapshots.forEach(c => restoreContract(c));
    expect(getContracts().map(c => c.id)).toEqual(['c1', 'c2']);
  });

  it('does not duplicate when restoring an existing contract', () => {
    saveContract(contract1);
    restoreContract(getContracts()[0]);
    expect(getContracts()).toHaveLength(1);
  });
});

describe('duplicate contract handling', () => {
  it('does not create a duplicate when saving the same id twice', () => {
    saveContract(contract1);
    saveContract({ ...contract1, label: 'Updated Label' });
    const contracts = getContracts();
    expect(contracts).toHaveLength(1);
  });

  it('updates the existing entry when saving a duplicate id', () => {
    saveContract(contract1);
    saveContract({ ...contract1, label: 'Updated Label' });
    expect(getContracts()[0].label).toBe('Updated Label');
  });
});

describe('saveAlert / getAlerts — insertion order', () => {
  it('returns alerts in insertion order', () => {
    saveAlert(alert1);
    saveAlert(alert2);
    saveAlert(alert3);
    const alerts = getAlerts('c1');
    expect(alerts.map(a => a.id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('returns empty array when no alerts exist for a contract (empty fallback)', () => {
    expect(getAlerts('no-such-contract')).toEqual([]);
  });
});

describe('deleteAlert', () => {
  it('removes only the specified alert', () => {
    saveAlert(alert1);
    saveAlert(alert2);
    deleteAlert('a1');
    const alerts = getAlerts('c1');
    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('a2');
  });
});

describe('per-contract cap', () => {
  it('retains all alerts when under the cap', () => {
    saveAlert({ id: 'a1', contractId: 'c1', type: 'transfer', threshold: 100 });
    saveAlert({ id: 'a2', contractId: 'c1', type: 'invocation', threshold: 0 });
    saveAlert({ id: 'a3', contractId: 'c1', type: 'balance', threshold: 500 });
    const contracts = getContracts();
    expect(contracts).toHaveLength(3);
  });

  it('prunes oldest alert when exceeding the cap', () => {
    saveAlert({ id: 'a1', contractId: 'c1', type: 'transfer', threshold: 100 });
    saveAlert({ id: 'a2', contractId: 'c1', type: 'invocation', threshold: 0 });
    saveAlert({ id: 'a3', contractId: 'c1', type: 'balance', threshold: 500 });
    saveAlert({ id: 'a4', contractId: 'c1', type: 'staking', threshold: 200 }); // 4th alert
    const contracts = getContracts();
    // Cap is 3, so oldest (a1) should be pruned
    expect(contracts).toHaveLength(3);
    expect(contracts.some((a) => a.id === 'a1')).toBe(false);
    expect(contracts.some((a) => a.id === 'a2')).toBe(true);
  });

  it('does not affect other contracts when one hits the cap', () => {
    saveAlert({ id: 'a1', contractId: 'c1', type: 'transfer', threshold: 100 });
    saveAlert({ id: 'a2', contractId: 'c1', type: 'invocation', threshold: 0 });
    saveAlert({ id: 'a3', contractId: 'c1', type: 'balance', threshold: 500 });
    saveAlert({ id: 'a4', contractId: 'c1', type: 'staking', threshold: 200 });
    saveAlert({ id: 'a5', contractId: 'c2', type: 'transfer', threshold: 50 });
    const contracts = getContracts();
    expect(contracts).toHaveLength(4); // c1 has 3, c2 has 1
    expect(contracts.filter((a) => a.contractId === 'c2').length).toBe(1);
  });
});

describe('pruneOldAlerts', () => {
  const OLD_DATE = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(); // 91 days ago
  const NEW_DATE = new Date().toISOString(); // today

  beforeEach(() => {
    // Simulate old and new alerts in localStorage
    localStorageMock.setItem('alert_a1', JSON.stringify({ ...alert1, timestamp: OLD_DATE }));
    localStorageMock.setItem('alert_a2', JSON.stringify({ ...alert2, timestamp: NEW_DATE }));
  });

  it('retains alert at exactly 90-day cutoff', () => {
    // alert at exactly 90 days should be retained
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    localStorageMock.setItem('alert_a3', JSON.stringify({ ...alert3, timestamp: ninetyDaysAgo }));
    pruneOldAlerts();
    const alerts = getAlerts();
    expect(alerts).toHaveLength(2); // a2 (new) + a3 (at cutoff)
  });

  it('prunes alert one millisecond beyond 90-day cutoff', () => {
    const beyondCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000 - 1).toISOString();
    localStorageMock.setItem('alert_a4', JSON.stringify({ ...alert4, timestamp: beyondCutoff }));
    pruneOldAlerts();
    const alerts = getAlerts();
    expect(alerts).toHaveLength(1); // only a2 (newest)
  });

  it('retains today\'s alerts', () => {
    pruneOldAlerts();
    const alerts = getAlerts();
    expect(alerts).toHaveLength(2); // a2 (new) + a3 retained at cutoff (if any)
  });

  it('handles empty alerts list', () => {
    // Clear all alerts
    localStorageMock.clear();
    pruneOldAlerts();
    const alerts = getAlerts();
    expect(alerts).toHaveLength(0);
  });

  it('handles mixed old and new alerts correctly', () => {
    // Add a very old alert
    localStorageMock.setItem('alert_very_old', JSON.stringify({ ...alert1, timestamp: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString() }));
    pruneOldAlerts();
    const alerts = getAlerts();
    // Should only retain new alerts (a2) and those at/near cutoff
    expect(alerts).toHaveLength(1);
  });
});

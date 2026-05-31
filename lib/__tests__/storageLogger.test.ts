import {
  safeParseStorage,
  onStorageError,
  clearStorageErrorHandlers,
  StorageErrorContext,
} from '../storageLogger';

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

beforeEach(() => {
  localStorageMock.clear();
  clearStorageErrorHandlers();
});

describe('safeParseStorage', () => {
  it('returns parsed value for valid JSON', () => {
    localStorage.setItem('key1', JSON.stringify([{ id: 'x' }]));
    expect(safeParseStorage('key1', [])).toEqual([{ id: 'x' }]);
  });

  it('returns fallback for missing key', () => {
    expect(safeParseStorage('missing', [])).toEqual([]);
  });

  it('returns fallback for malformed JSON', () => {
    localStorage.setItem('bad', '{not valid json}');
    expect(safeParseStorage('bad', [])).toEqual([]);
  });

  it('fires onStorageError hook for malformed JSON', () => {
    const received: StorageErrorContext[] = [];
    onStorageError(ctx => received.push(ctx));
    localStorage.setItem('bad2', 'definitely not json');
    safeParseStorage('bad2', null);
    expect(received).toHaveLength(1);
    expect(received[0].key).toBe('bad2');
    expect(received[0].rawValue).toBe('definitely not json');
    expect(received[0].timestamp).toBeTruthy();
  });

  it('does not fire hook for a missing key', () => {
    const received: StorageErrorContext[] = [];
    onStorageError(ctx => received.push(ctx));
    safeParseStorage('not-set', []);
    expect(received).toHaveLength(0);
  });

  it('does not throw if an error handler itself throws', () => {
    onStorageError(() => { throw new Error('handler crash'); });
    localStorage.setItem('bad3', 'bad');
    expect(() => safeParseStorage('bad3', null)).not.toThrow();
  });
});

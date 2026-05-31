import { renderHook, act } from '@testing-library/react';
import { useSortedLog } from '../hooks/useSortedLog';

const entries = [
  { timestamp: '2024-03-01T12:00:00Z', id: 'b' },
  { timestamp: '2024-03-03T12:00:00Z', id: 'c' },
  { timestamp: '2024-03-02T12:00:00Z', id: 'a' },
];

describe('useSortedLog', () => {
  it('defaults to descending (newest first)', () => {
    const { result } = renderHook(() => useSortedLog(entries));
    expect(result.current.sortedEntries.map(e => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('sorts ascending when initialDir is asc', () => {
    const { result } = renderHook(() => useSortedLog(entries, 'asc'));
    expect(result.current.sortedEntries.map(e => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('toggleSort flips direction', () => {
    const { result } = renderHook(() => useSortedLog(entries, 'desc'));
    act(() => result.current.toggleSort());
    expect(result.current.sortDirection).toBe('asc');
    expect(result.current.sortedEntries.map(e => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('toggleSort flips back to desc', () => {
    const { result } = renderHook(() => useSortedLog(entries, 'asc'));
    act(() => result.current.toggleSort());
    expect(result.current.sortDirection).toBe('desc');
  });

  it('setSortDirection sets asc explicitly', () => {
    const { result } = renderHook(() => useSortedLog(entries));
    act(() => result.current.setSortDirection('asc'));
    expect(result.current.sortDirection).toBe('asc');
  });

  it('does not mutate original array', () => {
    const original = [...entries];
    const { result } = renderHook(() => useSortedLog(entries));
    act(() => result.current.toggleSort());
    expect(entries).toEqual(original);
  });

  it('handles empty entries gracefully', () => {
    const { result } = renderHook(() => useSortedLog([]));
    expect(result.current.sortedEntries).toEqual([]);
  });

  it('handles malformed timestamps without throwing', () => {
    const bad = [{ timestamp: 'not-a-date', id: 'x' }];
    const { result } = renderHook(() => useSortedLog(bad));
    expect(() => result.current.sortedEntries).not.toThrow();
  });
});

import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';
export type SortField = 'timestamp' | 'delivery_status';

export interface SortableEntry {
  timestamp: string | number;
  delivery_status?: string;
}

export interface UseSortedLogReturn<T extends SortableEntry> {
  sortedEntries: T[];
  sortDirection: SortDirection;
  sortField: SortField;
  toggleSort: () => void;
  setSortDirection: (dir: SortDirection) => void;
  setSortField: (field: SortField) => void;
}

// Failed deliveries rank first in ascending order (#651)
const DELIVERY_RANK: Record<string, number> = { failed: 0, retrying: 1, delivered: 2 };
const UNKNOWN_RANK = 3;

function toMillis(value: string | number): number {
  return typeof value === 'number' ? value : Date.parse(value);
}

export function useSortedLog<T extends SortableEntry>(
  entries: T[],
  initialDir: SortDirection = 'desc',
  timestampKey: keyof T & string = 'timestamp',
): UseSortedLogReturn<T> {
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDir);
  const [sortField, setSortField] = useState<SortField>('timestamp');

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (sortField === 'delivery_status') {
        const ra = DELIVERY_RANK[a.delivery_status ?? ''] ?? UNKNOWN_RANK;
        const rb = DELIVERY_RANK[b.delivery_status ?? ''] ?? UNKNOWN_RANK;
        return sortDirection === 'asc' ? ra - rb : rb - ra;
      }
      const ta = toMillis(a[timestampKey] as string | number);
      const tb = toMillis(b[timestampKey] as string | number);
      if (isNaN(ta) || isNaN(tb)) return 0;
      return sortDirection === 'desc' ? tb - ta : ta - tb;
    });
  }, [entries, sortDirection, sortField, timestampKey]);

  const toggleSort = useCallback(() => {
    setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  return { sortedEntries, sortDirection, sortField, toggleSort, setSortDirection, setSortField };
}

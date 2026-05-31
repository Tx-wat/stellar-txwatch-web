import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortableEntry {
  timestamp: string;
  [key: string]: unknown;
}

export interface UseSortedLogReturn<T extends SortableEntry> {
  sortedEntries: T[];
  sortDirection: SortDirection;
  toggleSort: () => void;
  setSortDirection: (dir: SortDirection) => void;
}

export function useSortedLog<T extends SortableEntry>(
  entries: T[],
  initialDir: SortDirection = 'desc',
  timestampKey: keyof T & string = 'timestamp',
): UseSortedLogReturn<T> {
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDir);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const ta = Date.parse(a[timestampKey] as string);
      const tb = Date.parse(b[timestampKey] as string);
      if (isNaN(ta) || isNaN(tb)) return 0;
      return sortDirection === 'desc' ? tb - ta : ta - tb;
    });
  }, [entries, sortDirection, timestampKey]);

  const toggleSort = useCallback(() => {
    setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  return { sortedEntries, sortDirection, toggleSort, setSortDirection };
}

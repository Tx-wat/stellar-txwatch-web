'use client';

import React from 'react';
import { SortDirection } from '@/hooks/useSortedLog';

interface SortToggleProps {
  direction: SortDirection;
  onToggle: () => void;
  className?: string;
}

export function SortToggle({ direction, onToggle, className = '' }: SortToggleProps) {
  const label = direction === 'desc' ? 'Newest first' : 'Oldest first';
  const arrow = direction === 'desc' ? '↓' : '↑';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Sort by date: ${label}. Click to reverse.`}
      className={`inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      <span aria-hidden="true" className="text-sm leading-none">{arrow}</span>
      <span>{label}</span>
    </button>
  );
}

export default SortToggle;

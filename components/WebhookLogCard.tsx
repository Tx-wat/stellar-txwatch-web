'use client';

import React from 'react';
import { EXPLORERS, explorerTxUrl } from '@/lib/stellar';
import { getSettings } from '@/lib/storage';
import type { Network } from '@/types';

export interface WebhookEntry {
  id: string;
  timestamp: string;
  event: string;
  contractAddress?: string;
  status: 'success' | 'failed' | 'pending';
  amount?: string;
  asset?: string;
  txHash?: string;
  /** Network the transaction ran on; the explorer link defaults to testnet. */
  network?: Network;
}

interface WebhookLogCardProps {
  entry: WebhookEntry;
}

const STATUS_STYLES: Record<WebhookEntry['status'], string> = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed:  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

function formatTimestamp(ts: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts));
  } catch {
    return ts;
  }
}

function truncateHash(hash: string, chars = 8): string {
  if (hash.length <= chars * 2 + 3) return hash;
  return `${hash.slice(0, chars)}…${hash.slice(-chars)}`;
}

export function WebhookLogCard({ entry }: WebhookLogCardProps) {
  // Explorer comes from the saved settings, not a separate hook (#551).
  const explorer = getSettings().explorer;
  const explorerName = EXPLORERS.find((e) => e.id === explorer)?.name ?? explorer;

  return (
    <article
      className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3"
      aria-label={`Webhook event ${entry.event} at ${entry.timestamp}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm text-foreground break-all">
          {entry.event}
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[entry.status]}`}
        >
          {entry.status}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-label="Time">{formatTimestamp(entry.timestamp)}</span>
      </div>

      {entry.contractAddress && (
        <div className="text-xs">
          <span className="text-muted-foreground">Contract: </span>
          <span className="font-mono break-all text-foreground">
            {truncateHash(entry.contractAddress, 6)}
          </span>
        </div>
      )}

      {entry.amount && (
        <div className="text-xs">
          <span className="text-muted-foreground">Amount: </span>
          <span className="font-medium text-foreground">
            {entry.amount} {entry.asset ?? ''}
          </span>
        </div>
      )}

      {entry.txHash && (
        <div className="text-xs">
          <span className="text-muted-foreground">Tx: </span>
          <a
            href={explorerTxUrl(entry.network ?? 'testnet', entry.txHash, explorer)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-primary hover:underline break-all"
            aria-label={`View transaction ${entry.txHash} on ${explorerName}`}
          >
            {truncateHash(entry.txHash)}
          </a>
        </div>
      )}

      {/* Explicit explorer links, so Horizon and Stellar Expert are always one click away (#659) */}
      {entry.txHash && (
        <div className="flex flex-wrap gap-3 text-xs">
          <a
            href={explorerTxUrl(entry.network ?? 'testnet', entry.txHash, 'horizon')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View on Horizon
          </a>
          <a
            href={explorerTxUrl(entry.network ?? 'testnet', entry.txHash, 'stellar-expert')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View on Stellar Expert
          </a>
        </div>
      )}
    </article>
  );
}

export default WebhookLogCard;

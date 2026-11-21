'use client';

import React, { useState } from 'react';
import { explorerTxUrl, getExplorerName } from '@/lib/explorer';
import { useExplorerPreference } from '@/hooks/useExplorerPreference';

export interface WebhookEntry {
  id: string;
  timestamp: string;
  event: string;
  contractAddress?: string;
  status: 'success' | 'failed' | 'pending';
  amount?: string;
  asset?: string;
  txHash?: string;
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

interface AlertPayloadModalProps {
  entry: WebhookEntry;
  onClose: () => void;
}

function AlertPayloadModal({ entry, onClose }: AlertPayloadModalProps) {
  const [copied, setCopied] = useState(false);

  const payload = JSON.stringify(entry, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Alert payload"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Alert Payload</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              aria-label="Copy payload to clipboard"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-200 transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <pre className="overflow-auto max-h-96 p-4 text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all">
          {payload}
        </pre>
      </div>
    </div>
  );
}

export function WebhookLogCard({ entry }: WebhookLogCardProps) {
  const explorer = useExplorerPreference();
  const [showPayload, setShowPayload] = useState(false);

  return (
    <>
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
              href={explorerTxUrl(entry.txHash, explorer)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-primary hover:underline break-all"
              aria-label={`View transaction ${entry.txHash} on ${getExplorerName(explorer)}`}
            >
              {truncateHash(entry.txHash)}
            </a>
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPayload(true)}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            aria-label="View full alert payload"
          >
            View Payload
          </button>
        </div>
      </article>

      {showPayload && (
        <AlertPayloadModal entry={entry} onClose={() => setShowPayload(false)} />
      )}
    </>
  );
}

export default WebhookLogCard;

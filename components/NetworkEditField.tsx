'use client';

import React, { useState } from 'react';

export type StellarNetwork = 'mainnet' | 'testnet' | 'futurenet';

interface NetworkEditFieldProps {
  currentNetwork: StellarNetwork;
  onNetworkChange: (network: StellarNetwork) => void | Promise<void>;
  disabled?: boolean;
}

const NETWORK_OPTIONS: { value: StellarNetwork; label: string }[] = [
  { value: 'mainnet',   label: 'Mainnet (Public)' },
  { value: 'testnet',   label: 'Testnet'           },
  { value: 'futurenet', label: 'Futurenet'         },
];

const CAUTION_MESSAGES: Record<StellarNetwork, string> = {
  mainnet:
    'Switching to Mainnet: alert rules and duplicate-detection history are network-scoped. ' +
    'Existing alerts may not match mainnet transactions until re-evaluated.',
  testnet:
    'Switching to Testnet: this contract will no longer watch mainnet activity. ' +
    'Duplicate-detection context will reset.',
  futurenet:
    'Switching to Futurenet: this is an experimental network. ' +
    'Alert history and duplicate detection will be cleared.',
};

export function NetworkEditField({
  currentNetwork,
  onNetworkChange,
  disabled = false,
}: NetworkEditFieldProps) {
  const [editing, setEditing]         = useState(false);
  const [pendingNetwork, setPending]  = useState<StellarNetwork | null>(null);
  const [saving, setSaving]           = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = e.target.value as StellarNetwork;
    if (selected === currentNetwork) return;
    setPending(selected);
    setShowWarning(true);
  }

  async function handleConfirm() {
    if (!pendingNetwork) return;
    setSaving(true);
    try {
      await onNetworkChange(pendingNetwork);
    } finally {
      setSaving(false);
      setShowWarning(false);
      setPending(null);
      setEditing(false);
    }
  }

  function handleCancel() {
    setPending(null);
    setShowWarning(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground capitalize">
          {currentNetwork}
        </span>
        {!disabled && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-primary hover:underline"
            aria-label="Edit network"
          >
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select
          defaultValue={currentNetwork}
          onChange={handleSelectChange}
          disabled={saving}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Select network"
        >
          {NETWORK_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { setEditing(false); setPending(null); setShowWarning(false); }}
          className="text-xs text-muted-foreground hover:text-foreground"
          aria-label="Cancel network edit"
        >
          Cancel
        </button>
      </div>

      {showWarning && pendingNetwork && (
        <div
          role="alertdialog"
          aria-modal="false"
          aria-labelledby="network-warning-title"
          aria-describedby="network-warning-desc"
          className="rounded-md border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-4 space-y-3"
        >
          <div className="flex items-start gap-2">
            <span aria-hidden="true" className="text-yellow-600 text-lg leading-none mt-0.5">⚠</span>
            <div>
              <p
                id="network-warning-title"
                className="text-sm font-semibold text-yellow-900 dark:text-yellow-300"
              >
                Network change warning
              </p>
              <p
                id="network-warning-desc"
                className="mt-1 text-xs text-yellow-800 dark:text-yellow-400"
              >
                {CAUTION_MESSAGES[pendingNetwork]}
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted transition-colors"
            >
              Keep current
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              aria-label={`Confirm switch to ${pendingNetwork}`}
              className="rounded-md bg-yellow-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Switch to ${pendingNetwork}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkEditField;

'use client'

import { useState } from 'react'
import { WatchedContract } from '@/types'
import { isValidUrl } from '@/lib/stellar'

interface EditDetailsModalProps {
  contract: WatchedContract
  onSave: (updated: WatchedContract) => void
  onClose: () => void
}

export default function EditDetailsModal({ contract, onSave, onClose }: EditDetailsModalProps) {
  const [label, setLabel] = useState(contract.label)
  const [webhookUrl, setWebhookUrl] = useState(contract.webhook_url)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    const trimmedLabel = label.trim()
    const trimmedUrl = webhookUrl.trim()

    if (!trimmedLabel) { setError('Label is required'); return }
    if (trimmedLabel.length > 100) { setError('Label must be 100 characters or less'); return }
    if (!trimmedUrl) { setError('Webhook URL is required'); return }
    if (!isValidUrl(trimmedUrl)) { setError('Please enter a valid HTTP or HTTPS URL'); return }

    onSave({ ...contract, label: trimmedLabel, webhook_url: trimmedUrl })
  }

  function handleCancel() {
    const isDirty = label !== contract.label || webhookUrl !== contract.webhook_url
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to discard them?')) onClose()
    } else {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100">Edit Contract Details</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="edit-label" className="block text-sm font-medium text-zinc-300 mb-2">
              Label
            </label>
            <input
              id="edit-label"
              type="text"
              value={label}
              onChange={(e) => { setLabel(e.target.value); setError(null) }}
              placeholder="My Contract"
              maxLength={100}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500 mt-1">{label.length}/100 characters</p>
          </div>

          <div>
            <label htmlFor="edit-webhook" className="block text-sm font-medium text-zinc-300 mb-2">
              Webhook URL
            </label>
            <input
              id="edit-webhook"
              type="url"
              value={webhookUrl}
              onChange={(e) => { setWebhookUrl(e.target.value); setError(null) }}
              placeholder="https://example.com/webhook"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500 mt-1">Must be a valid HTTP or HTTPS URL</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

interface BulkDeleteModalProps {
  count: number
  onConfirm: () => void
  onClose: () => void
}

/**
 * Confirmation dialog shown before deleting the selected contracts.
 */
export default function BulkDeleteModal({ count, onConfirm, onClose }: BulkDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-delete-title"
        aria-describedby="bulk-delete-description"
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4"
      >
        <h3 id="bulk-delete-title" className="text-lg font-semibold text-zinc-100">
          Delete selected contracts?
        </h3>
        <p id="bulk-delete-description" className="text-sm text-zinc-400">
          This will permanently remove {count} {count === 1 ? 'contract' : 'contracts'} and all of their
          alert history. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors"
          >
            Delete {count} {count === 1 ? 'contract' : 'contracts'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

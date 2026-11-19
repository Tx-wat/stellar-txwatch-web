'use client'

interface DeleteContractModalProps {
  contractLabel: string
  alertCount: number
  onConfirm: () => void
  onClose: () => void
}

export default function DeleteContractModal({
  contractLabel,
  alertCount,
  onConfirm,
  onClose,
}: DeleteContractModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-semibold text-zinc-100">Delete Contract?</h3>
        <div className="space-y-2 text-sm text-zinc-400">
          <p>
            This will permanently remove{' '}
            <span className="text-zinc-200 font-medium">{contractLabel}</span> and cannot be undone.
          </p>
          <p className="text-xs text-zinc-500">Deleted data:</p>
          <ul className="text-xs text-zinc-500 list-disc list-inside space-y-1">
            <li>Contract configuration and alert rules</li>
            <li>
              All {alertCount} alert {alertCount === 1 ? 'record' : 'records'}
            </li>
          </ul>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium text-white transition-colors"
          >
            Delete
          </button>
          <button
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

import { useState } from 'react'

interface BulkActionBarProps {
  selectedCount: number
  allVisibleSelected: boolean
  onToggleSelectAll: () => void
  onClearSelection: () => void
  onDeleteSelected: () => void
}

export default function BulkActionBar({
  selectedCount,
  allVisibleSelected,
  onToggleSelectAll,
  onClearSelection,
  onDeleteSelected,
}: BulkActionBarProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={onToggleSelectAll}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 accent-indigo-600"
        />
        <span>{selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}</span>
      </label>

      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          {confirming ? (
            <>
              <span className="text-zinc-400">
                Delete {selectedCount} {selectedCount === 1 ? 'contract' : 'contracts'}?
              </span>
              <button
                type="button"
                onClick={() => {
                  onDeleteSelected()
                  setConfirming(false)
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-600"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-600"
              >
                Clear selection
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500"
              >
                Delete selected
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
  /** Optional keyboard-shortcut hint rendered below the action. */
  shortcutHint?: string
}

export default function EmptyState({ title, description, action, shortcutHint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-6">{description}</p>
      {action}
      {shortcutHint && (
        <p className="mt-4 text-xs text-zinc-500">
          Tip: press{' '}
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
            {shortcutHint}
          </kbd>{' '}
          to add a contract
        </p>
      )}
    </div>
  )
}

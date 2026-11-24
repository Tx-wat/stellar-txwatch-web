const TABLE_COLUMNS = '160px 180px 1fr 140px 120px 120px'

/**
 * Loading placeholder for the virtualised WebhookLog table. The header,
 * statistics bar and six-column grid match the rendered table so the layout
 * does not jump once alerts have loaded.
 */
export default function WebhookLogSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {/* Filter controls */}
      <div className="flex flex-wrap gap-2">
        <div className="h-8 flex-1 min-w-[200px] bg-zinc-800 rounded-lg" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 w-20 bg-zinc-800 rounded-lg" />
        ))}
      </div>

      {/* Results summary and CSV export */}
      <div className="flex justify-between items-center">
        <div className="h-3 w-28 bg-zinc-800 rounded" />
        <div className="h-3 w-20 bg-zinc-800 rounded" />
      </div>

      {/* Table header */}
      <div className="grid gap-4 border-b border-zinc-800 pb-3" style={{ gridTemplateColumns: TABLE_COLUMNS }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-3 w-16 bg-zinc-800 rounded" />
        ))}
      </div>

      {/* Table rows */}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid gap-4 py-2" style={{ gridTemplateColumns: TABLE_COLUMNS }}>
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-5 w-24 bg-zinc-800 rounded" />
          <div className="h-4 w-full bg-zinc-800 rounded" />
          <div className="h-4 w-20 bg-zinc-800 rounded" />
          <div className="h-4 w-14 bg-zinc-800 rounded" />
          <div className="h-4 w-14 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  )
}

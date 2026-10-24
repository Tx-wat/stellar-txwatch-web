export default function ContractDetailLoading() {
  return (
    <div className="space-y-8 max-w-4xl animate-pulse">
      {/* Header — label + network badge + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-8 w-48 bg-zinc-800 rounded" />
            <div className="h-5 w-16 bg-zinc-800 rounded-full" />
          </div>
          <div className="h-4 w-36 bg-zinc-800 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 bg-zinc-800 rounded-lg" />
          <div className="h-8 w-24 bg-zinc-800 rounded-lg" />
          <div className="h-8 w-16 bg-zinc-800 rounded-lg" />
        </div>
      </div>

      {/* Metadata cards — Webhook URL · Registered · Last Alert */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-4 w-full bg-zinc-800 rounded" />
            <div className="h-3 w-24 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Active Rules */}
      <div className="space-y-3">
        <div className="h-5 w-28 bg-zinc-800 rounded" />
        <div className="flex flex-wrap gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 w-32 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Alert History */}
      <div className="space-y-3">
        <div className="h-5 w-32 bg-zinc-800 rounded" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
          {/* Filter pills */}
          <div className="flex gap-2 flex-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-7 w-20 bg-zinc-800 rounded-lg" />
            ))}
          </div>
          {/* Table header */}
          <div className="grid gap-4 border-b border-zinc-800 pb-3"
               style={{ gridTemplateColumns: '160px 180px 1fr 140px 120px' }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-3 w-16 bg-zinc-800 rounded" />
            ))}
          </div>
          {/* Table rows */}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="grid gap-4 py-2"
                 style={{ gridTemplateColumns: '160px 180px 1fr 140px 120px' }}>
              <div className="h-4 w-28 bg-zinc-800 rounded" />
              <div className="h-5 w-24 bg-zinc-800 rounded" />
              <div className="h-4 w-full bg-zinc-800 rounded" />
              <div className="h-4 w-16 bg-zinc-800 rounded" />
              <div className="h-4 w-14 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ContractsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-zinc-800 rounded" />
          <div className="h-4 w-24 bg-zinc-800 rounded" />
        </div>
        <div className="h-9 w-32 bg-zinc-800 rounded-lg" />
      </div>

      {/* Contract cards — mirrors ContractCard layout */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            {/* label + network badge row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="space-y-1.5 min-w-0">
                <div className="h-4 w-32 bg-zinc-800 rounded" />
                <div className="h-3 w-36 bg-zinc-800 rounded" />
              </div>
              <div className="h-5 w-16 bg-zinc-800 rounded-full shrink-0" />
            </div>
            {/* rules count + last alert row */}
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-zinc-800 rounded" />
              <div className="h-3 w-20 bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

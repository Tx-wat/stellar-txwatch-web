export default function NewContractLoading() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-pulse">
      {/* Page title */}
      <div className="space-y-2">
        <div className="h-8 w-36 bg-zinc-800 rounded" />
        <div className="h-4 w-56 bg-zinc-800 rounded" />
      </div>

      <div className="space-y-5">
        {/* Label field */}
        <div className="space-y-1.5">
          <div className="h-4 w-12 bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-800 rounded-lg" />
        </div>

        {/* Contract ID field */}
        <div className="space-y-1.5">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-800 rounded-lg" />
          <div className="h-3 w-72 bg-zinc-800 rounded" />
        </div>

        {/* Network select */}
        <div className="space-y-1.5">
          <div className="h-4 w-16 bg-zinc-800 rounded" />
          <div className="h-10 w-full bg-zinc-800 rounded-lg" />
        </div>

        {/* Webhook URL + Test button */}
        <div className="space-y-1.5">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          <div className="flex gap-2">
            <div className="flex-1 h-10 bg-zinc-800 rounded-lg" />
            <div className="h-10 w-16 bg-zinc-800 rounded-lg" />
          </div>
          <div className="h-3 w-64 bg-zinc-800 rounded" />
        </div>

        {/* Alert Rules section */}
        <div className="space-y-3">
          <div className="h-4 w-24 bg-zinc-800 rounded" />
          {/* Rule builder form card */}
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-3">
            <div className="space-y-1.5">
              <div className="h-3 w-20 bg-zinc-800 rounded" />
              <div className="h-10 w-full bg-zinc-800 rounded-lg" />
            </div>
            <div className="h-8 w-24 bg-zinc-800 rounded-lg" />
          </div>
        </div>

        {/* Wallet section */}
        <div className="space-y-1.5">
          <div className="h-4 w-14 bg-zinc-800 rounded" />
          <div className="h-10 w-44 bg-zinc-800 rounded-lg" />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <div className="h-10 w-32 bg-zinc-800 rounded-lg" />
          <div className="h-10 w-20 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

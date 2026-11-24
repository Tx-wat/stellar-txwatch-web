/**
 * Loading placeholder mirroring the contract detail header (label, network
 * badge, contract id and the header action buttons).
 */
export default function ContractHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4" aria-hidden="true">
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-5 w-16 bg-zinc-800 rounded-full" />
        </div>
        <div className="h-4 w-56 bg-zinc-800 rounded" />
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="h-8 w-20 bg-zinc-800 rounded-lg" />
        <div className="h-8 w-20 bg-zinc-800 rounded-lg" />
        <div className="h-8 w-24 bg-zinc-800 rounded-lg" />
        <div className="h-8 w-20 bg-zinc-800 rounded-lg" />
        <div className="h-8 w-16 bg-zinc-800 rounded-lg" />
      </div>
    </div>
  )
}

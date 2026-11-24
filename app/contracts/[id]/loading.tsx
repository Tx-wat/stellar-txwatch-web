import ActiveRulesListSkeleton from '@/components/skeletons/ActiveRulesListSkeleton'
import ContractHeaderSkeleton from '@/components/skeletons/ContractHeaderSkeleton'
import WebhookLogSkeleton from '@/components/skeletons/WebhookLogSkeleton'

/**
 * Route-level loading state for the contract detail page.
 *
 * The placeholders follow the same section order and grid layout as the real
 * page (header, metadata, TTL, rules, activity and alert history) so navigation
 * feels instantaneous instead of showing a blank spinner.
 */
export default function ContractDetailLoading() {
  return (
    <div
      className="space-y-8 max-w-4xl animate-pulse"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading contract details"
    >
      <span className="sr-only">Loading contract details…</span>

      {/* Header — label + network badge + action buttons */}
      <ContractHeaderSkeleton />

      {/* Metadata cards — Webhook URL · Registered · Last Alert */}
      <div className="grid sm:grid-cols-3 gap-4" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <div className="h-3 w-20 bg-zinc-800 rounded" />
            <div className="h-4 w-full bg-zinc-800 rounded" />
            <div className="h-3 w-24 bg-zinc-800 rounded" />
          </div>
        ))}
      </div>

      {/* Instance expiry */}
      <div className="space-y-3" aria-hidden="true">
        <div className="h-5 w-32 bg-zinc-800 rounded" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="h-3 w-28 bg-zinc-800 rounded" />
          <div className="h-4 w-48 bg-zinc-800 rounded" />
        </div>
      </div>

      {/* Timezone toggle */}
      <div className="h-4 w-52 bg-zinc-800 rounded" aria-hidden="true" />

      {/* Active rules */}
      <ActiveRulesListSkeleton />

      {/* Alert activity heatmap */}
      <div className="space-y-3" aria-hidden="true">
        <div className="h-5 w-36 bg-zinc-800 rounded" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 49 }, (_, i) => (
              <div key={i} className="h-4 w-full bg-zinc-800 rounded-sm" />
            ))}
          </div>
        </div>
      </div>

      {/* Alert history / WebhookLog table */}
      <div className="space-y-3">
        <div className="h-5 w-32 bg-zinc-800 rounded" aria-hidden="true" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <WebhookLogSkeleton />
        </div>
      </div>

      {/* Recent activity */}
      <div className="space-y-3" aria-hidden="true">
        <div className="h-5 w-36 bg-zinc-800 rounded" />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-zinc-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

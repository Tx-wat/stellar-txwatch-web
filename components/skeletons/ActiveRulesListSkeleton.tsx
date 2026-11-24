/**
 * Loading placeholder matching the "Active Rules" section of the contract
 * detail page: a heading followed by a row of rule pills.
 */
export default function ActiveRulesListSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="h-5 w-28 bg-zinc-800 rounded" />
      <div className="flex flex-wrap gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 w-32 bg-zinc-800 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

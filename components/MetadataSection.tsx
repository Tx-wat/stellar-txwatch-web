interface MetadataSectionProps {
  label: string
  value?: string | number
  loading?: boolean
  children?: React.ReactNode
}

export default function MetadataSection({
  label,
  value,
  loading = false,
  children,
}: MetadataSectionProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          <div className="h-3 w-3/4 rounded bg-zinc-800 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-zinc-800 animate-pulse" />
        </div>
      ) : children !== undefined ? (
        <div className="text-sm text-zinc-300 break-all">{children}</div>
      ) : (
        <p className="text-sm text-zinc-300 break-all">{value}</p>
      )}
    </div>
  )
}
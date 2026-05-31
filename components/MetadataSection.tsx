interface MetadataSectionProps {
  label: string
  value: string | number
}

export default function MetadataSection({ label, value }: MetadataSectionProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm text-zinc-300 break-all">{value}</p>
    </div>
  )
}

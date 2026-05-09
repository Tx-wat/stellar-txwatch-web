import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-black text-zinc-800 mb-4">404</p>
      <h1 className="text-xl font-semibold text-zinc-200 mb-2">Page not found</h1>
      <p className="text-sm text-zinc-500 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium text-white transition-colors"
      >
        Go home
      </Link>
    </div>
  )
}

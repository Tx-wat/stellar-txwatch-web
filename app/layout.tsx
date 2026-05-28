import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import FreighterConnect from '@/components/FreighterConnect'
import WalletStatusBadge from '@/components/WalletStatusBadge'
import MobileNav from '@/components/MobileNav'

export const metadata: Metadata = {
  title: 'TxWatch — Soroban Contract Monitoring',
  description: 'Real-time monitoring and alerts for Soroban smart contracts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-100">
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                TX
              </span>
              <span className="text-zinc-100">TxWatch</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-400">
              <Link href="/dashboard" className="hover:text-zinc-100 transition-colors">Dashboard</Link>
              <Link href="/contracts" className="hover:text-zinc-100 transition-colors">Contracts</Link>
              <a
                href="https://github.com/Tx-wat"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-100 transition-colors"
              >
                GitHub
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <WalletStatusBadge />
              <FreighterConnect />
            </div>
            <MobileNav />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}

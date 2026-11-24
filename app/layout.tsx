import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import FreighterConnect from '@/components/FreighterConnect'
import WalletStatusBadge from '@/components/WalletStatusBadge'
import MobileNav from '@/components/MobileNav'
import WebVitals from '@/components/WebVitals'
import StorageContext from '@/lib/StorageContext'
import ToastProvider from '@/components/ToastProvider'
import TimezoneProvider from '@/components/TimezoneProvider'
import OnboardingTour from '@/components/OnboardingTour'
import HeaderSyncStatus from '@/components/HeaderSyncStatus'
import ThemeProvider from '@/components/ThemeProvider'
import ThemeToggle from '@/components/ThemeToggle'

export const metadata: Metadata = {
  title: {
    default: 'TxWatch',
    template: '%s · TxWatch',
  },
  description: 'Real-time monitoring and alerts for Soroban smart contracts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * Start with class="dark" so the initial SSR paint matches the app's
     * default dark theme.  ThemeProvider's useEffect will immediately
     * reconcile this with the user's stored preference or OS setting on the
     * client without a visible flash.
     */
    <html lang="en" className="dark">
      <body className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors duration-200">
        <WebVitals />
        <ThemeProvider>
          <ToastProvider>
            <TimezoneProvider>
              <StorageContext>
                <header className="border-b border-zinc-200 bg-white/80 dark:border-zinc-800 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                        TX
                      </span>
                      <span className="text-zinc-900 dark:text-zinc-100">TxWatch</span>
                    </Link>

                    <nav className="hidden sm:flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
                      <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Dashboard</Link>
                      <Link href="/contracts" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Contracts</Link>
                      <Link href="/settings" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Settings</Link>
                      <a
                        href="https://github.com/Tx-wat"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        GitHub
                      </a>
                    </nav>

                    <div className="flex items-center gap-3">
                      <ThemeToggle />
                      <HeaderSyncStatus />
                      <WalletStatusBadge />
                      <FreighterConnect />
                    </div>
                    <MobileNav />
                  </div>
                </header>

                <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
                  {children}
                </main>

                <OnboardingTour />
              </StorageContext>
            </TimezoneProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

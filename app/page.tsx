import Link from 'next/link'
import FreighterConnect from '@/components/FreighterConnect'

const features = [
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    ),
    title: 'Watch any Soroban contract',
    desc: 'Register contracts on Mainnet, Testnet, or Futurenet and start monitoring in seconds.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    ),
    title: 'Flexible alert rules',
    desc: 'Trigger on large transfers, specific function calls, admin actions, or any transaction.',
  },
  {
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M13 10V3L4 14h7v7l9-11h-7z" />
    ),
    title: 'Instant webhook delivery',
    desc: 'Receive structured JSON payloads to any endpoint the moment a rule fires.',
  },
]

const steps = [
  { n: '01', title: 'Register', desc: 'Connect Freighter and add your Soroban contract ID.' },
  { n: '02', title: 'Configure', desc: 'Define alert rules - thresholds, function names, or catch-all.' },
  { n: '03', title: 'Get Alerted', desc: 'Receive real-time webhook payloads when rules trigger.' },
]

export default function LandingPage() {
  return (
    <div className="space-y-24 py-8">
      {/* Hero */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          Real-time Soroban monitoring
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100 text-balance">
          Real-time monitoring and alerts for{' '}
          <span className="text-indigo-400">Soroban contracts</span>
        </h1>

        <p className="text-lg text-zinc-400 max-w-xl mx-auto text-balance">
          Register contracts, configure alert rules, and receive instant webhook
          notifications - all from one dashboard.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <FreighterConnect />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Open Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {f.icon}
                </svg>
              </div>
              <h3 className="font-semibold text-zinc-100">{f.title}</h3>
              <p className="text-sm text-zinc-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-zinc-100 mb-8 text-center">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="relative flex flex-col items-center text-center">
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-5 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-zinc-800" />
              )}
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white mb-4 relative z-10">
                {s.n}
              </div>
              <h3 className="font-semibold text-zinc-100 mb-1">{s.title}</h3>
              <p className="text-sm text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center space-y-4 border-t border-zinc-800 pt-12">
        <p className="text-zinc-500 text-sm">
          Open source - Part of the{' '}
          <a
            href="https://github.com/Tx-wat"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Tx-wat
          </a>{' '}
          GitHub org
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-zinc-600">
          <a href="https://github.com/Tx-wat/stellar-txwatch-core" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
            txwatch-core
          </a>
          <span>|</span>
          <a href="https://github.com/Tx-wat/stellar-txwatch-contracts" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
            txwatch-contracts
          </a>
          <span>|</span>
          <a href="https://github.com/Tx-wat/stellar-txwatch-web" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">
            txwatch-web
          </a>
        </div>
      </section>
    </div>
  )
}

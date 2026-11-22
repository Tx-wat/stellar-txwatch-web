'use client'

import Link from 'next/link'

interface EmptyStateProps {
  title: string
  description: string
  action?: React.ReactNode
  quickStart?: boolean
}

const QUICK_START_STEPS = [
  {
    number: 1,
    label: 'Install Freighter',
    description: 'The Stellar browser wallet for interacting with Soroban contracts.',
    href: 'https://freighter.app',
    linkText: 'freighter.app →',
    external: true,
  },
  {
    number: 2,
    label: 'Get testnet XLM',
    description: 'Fund your testnet account using the Stellar testnet faucet (Friendbot).',
    href: 'https://laboratory.stellar.org/#account-creator?network=test',
    linkText: 'Open Friendbot →',
    external: true,
  },
  {
    number: 3,
    label: 'Watch a contract',
    description: 'Paste any Soroban contract ID and configure alert rules to start monitoring.',
    href: '/contracts/new',
    linkText: 'Add your first contract →',
    external: false,
  },
] as const

export default function EmptyState({ title, description, action, quickStart }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-sm mb-6">{description}</p>
      {action}

      {quickStart && (
        <div className="mt-10 w-full max-w-lg text-left">
          <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 text-center">
            Quick-start guide
          </h4>
          <ol className="space-y-3">
            {QUICK_START_STEPS.map((step) => (
              <li
                key={step.number}
                className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600/20 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30"
                >
                  {step.number}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200">{step.label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{step.description}</p>
                  {step.external ? (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {step.linkText}
                    </a>
                  ) : (
                    <Link
                      href={step.href}
                      className="mt-1 inline-block text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {step.linkText}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contracts', label: 'Contracts' },
  { href: 'https://github.com/Tx-wat', label: 'GitHub', external: true },
]

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(true)}
        className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-64 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col gap-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-100">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-zinc-100 transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              {links.map((l) =>
                l.external ? (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-zinc-100 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="text-zinc-300 hover:text-zinc-100 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                )
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}

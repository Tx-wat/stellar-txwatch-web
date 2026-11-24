'use client'

import React from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ContractDetailErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
      }
    } catch {
      // Never let error reporting throw inside the error boundary.
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Something went wrong</h2>
          <p className="text-sm text-zinc-400 max-w-md mb-8">
            An error occurred while loading this contract. This might be a temporary Soroban RPC issue.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
            >
              Try again
            </button>
            <Link
              href="/contracts"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors"
            >
              Back to contracts
            </Link>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

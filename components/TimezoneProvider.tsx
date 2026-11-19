'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export type TimezoneMode = 'local' | 'utc'

const STORAGE_KEY = STORAGE_KEYS.TIMEZONE_MODE

interface TimezoneContextValue {
  mode: TimezoneMode
  toggleMode: () => void
  /** Format a Unix ms timestamp as a date string respecting the current mode. */
  formatDate: (timestamp: number) => string
  /** Format a Unix ms timestamp as a date+time string respecting the current mode. */
  formatDateTime: (timestamp: number) => string
  /** Return the full ISO-8601 string (always UTC) for tooltip use. */
  isoString: (timestamp: number) => string
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null)

function makeFormatDate(mode: TimezoneMode) {
  return (timestamp: number): string => {
    const date = new Date(timestamp)
    if (mode === 'utc') {
      return date.toLocaleDateString('en-US', { timeZone: 'UTC' })
    }
    return date.toLocaleDateString()
  }
}

function makeFormatDateTime(mode: TimezoneMode) {
  return (timestamp: number): string => {
    const date = new Date(timestamp)
    if (mode === 'utc') {
      return date.toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC'
    }
    return date.toLocaleString()
  }
}

function isoString(timestamp: number): string {
  return new Date(timestamp).toISOString()
}

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<TimezoneMode>('local')

  // Load persisted preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'utc' || stored === 'local') {
        setMode(stored)
      }
    } catch {
      // ignore (SSR or blocked storage)
    }
  }, [])

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: TimezoneMode = prev === 'local' ? 'utc' : 'local'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  return (
    <TimezoneContext.Provider
      value={{
        mode,
        toggleMode,
        formatDate: makeFormatDate(mode),
        formatDateTime: makeFormatDateTime(mode),
        isoString,
      }}
    >
      {children}
    </TimezoneContext.Provider>
  )
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext)
  if (!ctx) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  return ctx
}

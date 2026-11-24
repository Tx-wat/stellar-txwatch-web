'use client'

import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

export type ExplorerPreference = 'stellar-expert' | 'stellarchain' | 'horizon'

const STORAGE_SUFFIX = ':explorer'
const DEFAULT_EXPLORER: ExplorerPreference = 'stellar-expert'

function isExplorerPreference(value: unknown): value is ExplorerPreference {
  return value === 'stellar-expert' || value === 'stellarchain' || value === 'horizon'
}

/** The user's preferred block explorer, defaulting to Stellar Expert. */
export function useExplorerPreference(): ExplorerPreference {
  const [explorer, setExplorer] = useState<ExplorerPreference>(DEFAULT_EXPLORER)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.SETTINGS}${STORAGE_SUFFIX}`)
      if (isExplorerPreference(stored)) setExplorer(stored)
    } catch {
      // Storage may be unavailable; the default is still valid.
    }
  }, [])

  return explorer
}

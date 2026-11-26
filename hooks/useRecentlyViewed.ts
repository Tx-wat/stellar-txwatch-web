'use client'

import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/storageKeys'

const KEY = STORAGE_KEYS.RECENTLY_VIEWED
const MAX_ITEMS = 5

function readIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as unknown[]).filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function writeIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // quota exceeded — skip silently
  }
}

/**
 * Tracks the last `MAX_ITEMS` distinct contract IDs that have been viewed.
 *
 * Usage:
 *   const { recentIds, recordView } = useRecentlyViewed()
 *
 * Call `recordView(id)` whenever a contract detail page mounts.
 * Read `recentIds` on the contracts list page to render the "Recently Viewed" section.
 */
export function useRecentlyViewed() {
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    setRecentIds(readIds())
  }, [])

  const recordView = useCallback((id: string) => {
    setRecentIds((prev) => {
      const without = prev.filter((existing) => existing !== id)
      const next = [id, ...without].slice(0, MAX_ITEMS)
      writeIds(next)
      return next
    })
  }, [])

  const removeFromRecent = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = prev.filter((existing) => existing !== id)
      writeIds(next)
      return next
    })
  }, [])

  return { recentIds, recordView, removeFromRecent }
}

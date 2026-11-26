'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Provides infinite-scroll behaviour by observing a sentinel element.
 *
 * Usage:
 *   const { sentinelRef, visibleCount, reset } = useInfiniteScroll({ total, pageSize })
 *
 * Render `<div ref={sentinelRef} />` at the bottom of the list. When it enters
 * the viewport, `visibleCount` increments by `pageSize` until it reaches `total`.
 */
export function useInfiniteScroll({
  total,
  pageSize,
  enabled = true,
}: {
  total: number
  pageSize: number
  enabled?: boolean
}) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + pageSize, total))
  }, [pageSize, total])

  // Reset when the underlying dataset or enabled state changes
  const reset = useCallback(() => {
    setVisibleCount(pageSize)
  }, [pageSize])

  useEffect(() => {
    if (!enabled) return
    setVisibleCount((prev) => Math.min(Math.max(prev, pageSize), total))
  }, [enabled, pageSize, total])

  useEffect(() => {
    if (!enabled) {
      observerRef.current?.disconnect()
      return
    }

    const sentinel = sentinelRef.current
    if (!sentinel) return

    observerRef.current?.disconnect()

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    observerRef.current = observer

    return () => observer.disconnect()
  }, [enabled, loadMore])

  const hasMore = visibleCount < total

  return { sentinelRef, visibleCount, hasMore, reset, loadMore }
}

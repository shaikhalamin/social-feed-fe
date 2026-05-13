import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

type QueryLike = {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetching: boolean
  fetchNextPage: () => unknown
}

export function useInfiniteScrollSentinel(
  query: QueryLike,
): RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (
        entry.isIntersecting &&
        query.hasNextPage &&
        !query.isFetchingNextPage &&
        !query.isFetching
      ) {
        void query.fetchNextPage()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [
    query.hasNextPage,
    query.isFetchingNextPage,
    query.isFetching,
    query.fetchNextPage,
  ])

  return sentinelRef
}

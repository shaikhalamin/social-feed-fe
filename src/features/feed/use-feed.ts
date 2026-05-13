import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { getFeed } from '@/gen/api/clients/getFeed.ts'
import type { GetFeedQueryResponse } from '@/gen/api/types/GetFeed.ts'
import type { Post } from '@/gen/api/types/Post.ts'

export const feedQueryKey = ['feed', 'infinite'] as const

export function useFeed() {
  const query = useInfiniteQuery<
    GetFeedQueryResponse,
    Error,
    InfiniteData<GetFeedQueryResponse, string | undefined>,
    typeof feedQueryKey,
    string | undefined
  >({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }) =>
      getFeed({ params: { limit: 20, cursor: pageParam } }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const posts = useMemo<Post[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, posts }
}

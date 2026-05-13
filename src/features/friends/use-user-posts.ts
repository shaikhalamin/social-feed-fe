import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listPostsByUser } from '@/gen/api/clients/listPostsByUser.ts'
import type { ListPostsByUserQueryResponse } from '@/gen/api/types/ListPostsByUser.ts'
import type { Post } from '@/gen/api/types/Post.ts'

export const userPostsQueryKey = (userId: string) =>
  ['user-posts', userId, 'infinite'] as const

export function useUserPosts(userId: string) {
  const queryKey = userPostsQueryKey(userId)
  const query = useInfiniteQuery<
    ListPostsByUserQueryResponse,
    Error,
    InfiniteData<ListPostsByUserQueryResponse, string | undefined>,
    ReturnType<typeof userPostsQueryKey>,
    string | undefined
  >({
    queryKey,
    queryFn: ({ pageParam }) =>
      listPostsByUser({
        id: userId,
        params: { limit: 20, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    enabled: userId.length > 0,
  })

  const posts = useMemo<Post[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, posts }
}

import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listFriends } from '@/gen/api/clients/listFriends.ts'
import type { ListFriendsQueryResponse } from '@/gen/api/types/ListFriends.ts'
import type { Friend } from '@/gen/api/types/Friend.ts'

export const friendsQueryKey = ['friends', 'infinite'] as const

export function useFriends() {
  const query = useInfiniteQuery<
    ListFriendsQueryResponse,
    Error,
    InfiniteData<ListFriendsQueryResponse, string | undefined>,
    typeof friendsQueryKey,
    string | undefined
  >({
    queryKey: friendsQueryKey,
    queryFn: ({ pageParam }) =>
      listFriends({ params: { limit: 20, cursor: pageParam } }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const friends = useMemo<Friend[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, friends }
}

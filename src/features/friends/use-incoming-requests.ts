import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listIncomingFriendRequests } from '@/gen/api/clients/listIncomingFriendRequests.ts'
import type { ListIncomingFriendRequestsQueryResponse } from '@/gen/api/types/ListIncomingFriendRequests.ts'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'

export const incomingRequestsQueryKey = [
  'friend-requests',
  'incoming',
  'infinite',
] as const

export function useIncomingRequests() {
  const query = useInfiniteQuery<
    ListIncomingFriendRequestsQueryResponse,
    Error,
    InfiniteData<ListIncomingFriendRequestsQueryResponse, string | undefined>,
    typeof incomingRequestsQueryKey,
    string | undefined
  >({
    queryKey: incomingRequestsQueryKey,
    queryFn: ({ pageParam }) =>
      listIncomingFriendRequests({
        params: { limit: 20, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const incomingRequests = useMemo<FriendRequest[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, incomingRequests }
}

import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listOutgoingFriendRequests } from '@/gen/api/clients/listOutgoingFriendRequests.ts'
import type { ListOutgoingFriendRequestsQueryResponse } from '@/gen/api/types/ListOutgoingFriendRequests.ts'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'

export const outgoingRequestsQueryKey = [
  'friend-requests',
  'outgoing',
  'infinite',
] as const

export function useOutgoingRequests() {
  const query = useInfiniteQuery<
    ListOutgoingFriendRequestsQueryResponse,
    Error,
    InfiniteData<ListOutgoingFriendRequestsQueryResponse, string | undefined>,
    typeof outgoingRequestsQueryKey,
    string | undefined
  >({
    queryKey: outgoingRequestsQueryKey,
    queryFn: ({ pageParam }) =>
      listOutgoingFriendRequests({
        params: { limit: 20, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const outgoingRequests = useMemo<FriendRequest[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, outgoingRequests }
}

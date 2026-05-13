import type { InfiniteData } from '@tanstack/react-query'
import type { Friend } from '@/gen/api/types/Friend.ts'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'
import type { ListFriendsQueryResponse } from '@/gen/api/types/ListFriends.ts'
import type { ListIncomingFriendRequestsQueryResponse } from '@/gen/api/types/ListIncomingFriendRequests.ts'

export type FriendsPages = InfiniteData<
  ListFriendsQueryResponse,
  string | undefined
>
export type RequestsPages = InfiniteData<
  ListIncomingFriendRequestsQueryResponse,
  string | undefined
>

const EMPTY_PAGINATION: ListFriendsQueryResponse['pagination'] = {
  nextCursor: null,
  hasNext: false,
  limit: 20,
}

export function prependFriend(
  pages: FriendsPages | undefined,
  friend: Friend,
): FriendsPages {
  if (!pages || pages.pages.length === 0) {
    return {
      pages: [{ data: [friend], pagination: EMPTY_PAGINATION }],
      pageParams: [undefined],
    }
  }
  const [first, ...rest] = pages.pages
  const updatedFirst: ListFriendsQueryResponse = {
    ...first,
    data: [friend, ...first.data],
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

export function removeFriendByUserId(
  pages: FriendsPages | undefined,
  userId: string,
): FriendsPages | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((f) => f.user.id === userId),
  )
  if (!exists) return pages
  return {
    ...pages,
    pages: pages.pages.map((page) =>
      page.data.some((f) => f.user.id === userId)
        ? { ...page, data: page.data.filter((f) => f.user.id !== userId) }
        : page,
    ),
  }
}

export function prependRequest(
  pages: RequestsPages | undefined,
  request: FriendRequest,
): RequestsPages {
  if (!pages || pages.pages.length === 0) {
    return {
      pages: [{ data: [request], pagination: EMPTY_PAGINATION }],
      pageParams: [undefined],
    }
  }
  const [first, ...rest] = pages.pages
  const updatedFirst: ListIncomingFriendRequestsQueryResponse = {
    ...first,
    data: [request, ...first.data],
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

export function removeRequestByUserId(
  pages: RequestsPages | undefined,
  userId: string,
): RequestsPages | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((r) => r.user.id === userId),
  )
  if (!exists) return pages
  return {
    ...pages,
    pages: pages.pages.map((page) =>
      page.data.some((r) => r.user.id === userId)
        ? { ...page, data: page.data.filter((r) => r.user.id !== userId) }
        : page,
    ),
  }
}

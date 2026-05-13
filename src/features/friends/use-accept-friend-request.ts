import { useMutation } from '@tanstack/react-query'
import { acceptFriendRequest } from '@/gen/api/clients/acceptFriendRequest.ts'
import { acceptFriendRequestMutationKey } from '@/gen/api/hooks/useAcceptFriendRequest.ts'
import type { AcceptFriendRequestMutationResponse } from '@/gen/api/types/AcceptFriendRequest.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { isConflictError } from '@/lib/is-conflict-error'
import type { ApiError } from '@/lib/api-error'
import type { Friend } from '@/gen/api/types/Friend.ts'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'
import type { FriendsPages, RequestsPages } from './friends-cache'
import { prependFriend, removeRequestByUserId } from './friends-cache'
import { friendsQueryKey } from './use-friends'
import { incomingRequestsQueryKey } from './use-incoming-requests'
import { outgoingRequestsQueryKey } from './use-outgoing-requests'

type Variables = { user: UserSummary }

type Context = {
  previousFriends: FriendsPages | undefined
  previousIncoming: RequestsPages | undefined
  userId: string
}

export function useAcceptFriendRequest() {
  return useMutation<
    AcceptFriendRequestMutationResponse,
    ApiError,
    Variables,
    Context
  >({
    mutationKey: acceptFriendRequestMutationKey(),
    mutationFn: ({ user }) => acceptFriendRequest({ user_id: user.id }),
    onMutate: async ({ user }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: friendsQueryKey }),
        queryClient.cancelQueries({ queryKey: incomingRequestsQueryKey }),
      ])
      const previousFriends =
        queryClient.getQueryData<FriendsPages>(friendsQueryKey)
      const previousIncoming = queryClient.getQueryData<RequestsPages>(
        incomingRequestsQueryKey,
      )
      const optimisticFriend: Friend = {
        user,
        acceptedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<RequestsPages>(
        incomingRequestsQueryKey,
        (pages) => removeRequestByUserId(pages, user.id),
      )
      queryClient.setQueryData<FriendsPages>(friendsQueryKey, (pages) =>
        prependFriend(pages, optimisticFriend),
      )
      return { previousFriends, previousIncoming, userId: user.id }
    },
    onError: (err, _vars, context) => {
      if (context) {
        queryClient.setQueryData<FriendsPages>(
          friendsQueryKey,
          context.previousFriends,
        )
        queryClient.setQueryData<RequestsPages>(
          incomingRequestsQueryKey,
          context.previousIncoming,
        )
      }
      if (isConflictError(err)) {
        toast.error('This relationship has already changed')
        void queryClient.refetchQueries({ queryKey: friendsQueryKey })
        void queryClient.refetchQueries({
          queryKey: incomingRequestsQueryKey,
        })
        void queryClient.refetchQueries({
          queryKey: outgoingRequestsQueryKey,
        })
      } else {
        toast.error("Couldn't accept friend request")
      }
    },
  })
}

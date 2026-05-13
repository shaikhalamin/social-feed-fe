import { useMutation } from '@tanstack/react-query'
import { sendFriendRequest } from '@/gen/api/clients/sendFriendRequest.ts'
import { sendFriendRequestMutationKey } from '@/gen/api/hooks/useSendFriendRequest.ts'
import type { SendFriendRequestMutationResponse } from '@/gen/api/types/SendFriendRequest.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { isConflictError } from '@/lib/is-conflict-error'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'
import type { ApiError } from '@/lib/api-error'
import type { RequestsPages } from './friends-cache'
import { prependRequest } from './friends-cache'
import { friendsQueryKey } from './use-friends'
import { incomingRequestsQueryKey } from './use-incoming-requests'
import { outgoingRequestsQueryKey } from './use-outgoing-requests'

type Variables = { user: UserSummary }

type Context = {
  previous: RequestsPages | undefined
  userId: string
}

export function useSendFriendRequest() {
  return useMutation<
    SendFriendRequestMutationResponse,
    ApiError,
    Variables,
    Context
  >({
    mutationKey: sendFriendRequestMutationKey(),
    mutationFn: ({ user }) =>
      sendFriendRequest({ data: { userId: user.id } }),
    onMutate: async ({ user }) => {
      await queryClient.cancelQueries({
        queryKey: outgoingRequestsQueryKey,
      })
      const previous = queryClient.getQueryData<RequestsPages>(
        outgoingRequestsQueryKey,
      )
      const me = useAuthStore.getState().user
      if (me) {
        const optimistic: FriendRequest = {
          user,
          requesterId: me.id,
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
          (pages) => prependRequest(pages, optimistic),
        )
      }
      return { previous, userId: user.id }
    },
    onError: (err, _vars, context) => {
      if (context) {
        queryClient.setQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
          context.previous,
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
        toast.error("Couldn't send friend request")
      }
    },
  })
}

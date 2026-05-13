import { useMutation } from '@tanstack/react-query'
import { deleteFriendRelationship } from '@/gen/api/clients/deleteFriendRelationship.ts'
import { deleteFriendRelationshipMutationKey } from '@/gen/api/hooks/useDeleteFriendRelationship.ts'
import type { DeleteFriendRelationshipMutationResponse } from '@/gen/api/types/DeleteFriendRelationship.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { isConflictError } from '@/lib/is-conflict-error'
import type { ApiError } from '@/lib/api-error'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'
import type { FriendsPages, RequestsPages } from './friends-cache'
import {
  removeFriendByUserId,
  removeRequestByUserId,
} from './friends-cache'
import { friendsQueryKey } from './use-friends'
import { incomingRequestsQueryKey } from './use-incoming-requests'
import { outgoingRequestsQueryKey } from './use-outgoing-requests'

export type DeleteMode = 'unfriend' | 'cancel' | 'decline'

type Variables = { user: UserSummary; mode: DeleteMode }

type Context = {
  mode: DeleteMode
  previousFriends?: FriendsPages | undefined
  previousOutgoing?: RequestsPages | undefined
  previousIncoming?: RequestsPages | undefined
  userId: string
}

const ERROR_BY_MODE: Record<DeleteMode, string> = {
  unfriend: "Couldn't unfriend",
  cancel: "Couldn't cancel request",
  decline: "Couldn't decline request",
}

export function useDeleteFriendRelationship() {
  return useMutation<
    DeleteFriendRelationshipMutationResponse,
    ApiError,
    Variables,
    Context
  >({
    mutationKey: deleteFriendRelationshipMutationKey(),
    mutationFn: ({ user }) =>
      deleteFriendRelationship({ user_id: user.id }),
    onMutate: async ({ user, mode }) => {
      if (mode === 'unfriend') {
        await queryClient.cancelQueries({ queryKey: friendsQueryKey })
        const previousFriends =
          queryClient.getQueryData<FriendsPages>(friendsQueryKey)
        queryClient.setQueryData<FriendsPages>(friendsQueryKey, (pages) =>
          removeFriendByUserId(pages, user.id),
        )
        return { mode, previousFriends, userId: user.id }
      }
      if (mode === 'cancel') {
        await queryClient.cancelQueries({
          queryKey: outgoingRequestsQueryKey,
        })
        const previousOutgoing = queryClient.getQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
        )
        queryClient.setQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
          (pages) => removeRequestByUserId(pages, user.id),
        )
        return { mode, previousOutgoing, userId: user.id }
      }
      // decline
      await queryClient.cancelQueries({
        queryKey: incomingRequestsQueryKey,
      })
      const previousIncoming = queryClient.getQueryData<RequestsPages>(
        incomingRequestsQueryKey,
      )
      queryClient.setQueryData<RequestsPages>(
        incomingRequestsQueryKey,
        (pages) => removeRequestByUserId(pages, user.id),
      )
      return { mode, previousIncoming, userId: user.id }
    },
    onError: (err, _vars, context) => {
      if (context) {
        if (context.mode === 'unfriend' && context.previousFriends) {
          queryClient.setQueryData<FriendsPages>(
            friendsQueryKey,
            context.previousFriends,
          )
        }
        if (context.mode === 'cancel' && context.previousOutgoing) {
          queryClient.setQueryData<RequestsPages>(
            outgoingRequestsQueryKey,
            context.previousOutgoing,
          )
        }
        if (context.mode === 'decline' && context.previousIncoming) {
          queryClient.setQueryData<RequestsPages>(
            incomingRequestsQueryKey,
            context.previousIncoming,
          )
        }
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
        const mode = context?.mode ?? 'unfriend'
        toast.error(ERROR_BY_MODE[mode])
      }
    },
  })
}

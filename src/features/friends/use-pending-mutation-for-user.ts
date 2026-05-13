import { useMutationState } from '@tanstack/react-query'
import { acceptFriendRequestMutationKey } from '@/gen/api/hooks/useAcceptFriendRequest.ts'
import { deleteFriendRelationshipMutationKey } from '@/gen/api/hooks/useDeleteFriendRelationship.ts'
import { sendFriendRequestMutationKey } from '@/gen/api/hooks/useSendFriendRequest.ts'

function pickUserId(context: unknown): string | undefined {
  if (typeof context !== 'object' || context === null) return undefined
  if (!('userId' in context)) return undefined
  const val = context.userId
  return typeof val === 'string' ? val : undefined
}

export function usePendingFriendshipMutationForUser(userId: string): boolean {
  const sendPending = useMutationState({
    filters: {
      mutationKey: sendFriendRequestMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  const acceptPending = useMutationState({
    filters: {
      mutationKey: acceptFriendRequestMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  const deletePending = useMutationState({
    filters: {
      mutationKey: deleteFriendRelationshipMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  return (
    sendPending.includes(userId) ||
    acceptPending.includes(userId) ||
    deletePending.includes(userId)
  )
}

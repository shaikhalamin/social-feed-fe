import { useMutationState } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { acceptFriendRequestMutationKey } from '@/gen/api/hooks/useAcceptFriendRequest.ts'
import { deleteFriendRelationshipMutationKey } from '@/gen/api/hooks/useDeleteFriendRelationship.ts'
import { useAcceptFriendRequest } from '@/features/friends/use-accept-friend-request'
import { useDeleteFriendRelationship } from '@/features/friends/use-delete-friend-relationship'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'
import { PersonRow } from './PersonRow'

type Kind = 'incoming' | 'outgoing'

type Props = {
  request: FriendRequest
  kind: Kind
}

function pickUserId(context: unknown): string | undefined {
  if (typeof context !== 'object' || context === null) return undefined
  if (!('userId' in context)) return undefined
  const val = context.userId
  return typeof val === 'string' ? val : undefined
}

function usePendingForUser(userId: string): boolean {
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
  return acceptPending.includes(userId) || deletePending.includes(userId)
}

export function FriendRequestRow({ request, kind }: Props) {
  const accept = useAcceptFriendRequest()
  const remove = useDeleteFriendRelationship()
  const isPending = usePendingForUser(request.user.id)

  const action =
    kind === 'incoming' ? (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={isPending}
          onClick={() => accept.mutate({ user: request.user })}
          className="h-8 px-3 text-xs"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Accept'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            remove.mutate({ user: request.user, mode: 'decline' })
          }
          className="h-8 px-3 text-xs"
        >
          Decline
        </Button>
      </div>
    ) : (
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          remove.mutate({ user: request.user, mode: 'cancel' })
        }
        className="h-8 px-3 text-xs"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Cancel'}
      </Button>
    )

  return (
    <PersonRow
      user={request.user}
      profileLinkUserId={request.user.id}
      action={action}
    />
  )
}

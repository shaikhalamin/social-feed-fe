import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAcceptFriendRequest } from '@/features/friends/use-accept-friend-request'
import { useDeleteFriendRelationship } from '@/features/friends/use-delete-friend-relationship'
import { usePendingFriendshipMutationForUser } from '@/features/friends/use-pending-mutation-for-user'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'
import { PersonRow } from './PersonRow'

type Kind = 'incoming' | 'outgoing'

type Props = {
  request: FriendRequest
  kind: Kind
}

export function FriendRequestRow({ request, kind }: Props) {
  const accept = useAcceptFriendRequest()
  const remove = useDeleteFriendRelationship()
  const isPending = usePendingFriendshipMutationForUser(request.user.id)

  const actions =
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
          onClick={() => remove.mutate({ user: request.user, mode: 'decline' })}
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
        onClick={() => remove.mutate({ user: request.user, mode: 'cancel' })}
        className="h-8 px-3 text-xs"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Cancel'}
      </Button>
    )

  return (
    <div className="space-y-2">
      <PersonRow user={request.user} profileLinkUserId={request.user.id} />
      <div className="pl-[3.25rem]">{actions}</div>
    </div>
  )
}

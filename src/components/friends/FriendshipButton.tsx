import { useMutationState } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendFriendRequestMutationKey } from '@/gen/api/hooks/useSendFriendRequest.ts'
import { acceptFriendRequestMutationKey } from '@/gen/api/hooks/useAcceptFriendRequest.ts'
import { deleteFriendRelationshipMutationKey } from '@/gen/api/hooks/useDeleteFriendRelationship.ts'
import { useFriendshipStatus } from '@/features/friends/use-friendship-status'
import { useSendFriendRequest } from '@/features/friends/use-send-friend-request'
import { useAcceptFriendRequest } from '@/features/friends/use-accept-friend-request'
import { useDeleteFriendRelationship } from '@/features/friends/use-delete-friend-relationship'
import { cn } from '@/lib/utils'
import type { User } from '@/gen/api/types/User.ts'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'

type Variant = 'primary' | 'inline' | 'ghost'

type Props = {
  user: User | UserSummary
  variant?: Variant
}

function pickUserId(context: unknown): string | undefined {
  if (typeof context !== 'object' || context === null) return undefined
  if (!('userId' in context)) return undefined
  const val = context.userId
  return typeof val === 'string' ? val : undefined
}

function usePendingForUser(userId: string): boolean {
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

function toUserSummary(user: User | UserSummary): UserSummary {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

export function FriendshipButton({ user, variant = 'primary' }: Props) {
  const { state, isLoading } = useFriendshipStatus(user.id)
  const send = useSendFriendRequest()
  const accept = useAcceptFriendRequest()
  const remove = useDeleteFriendRelationship()
  const isPending = usePendingForUser(user.id)
  const summary = toUserSummary(user)

  if (state === 'self') return null

  if (isLoading) {
    return (
      <Button
        size={variant === 'inline' ? 'sm' : 'default'}
        variant="outline"
        disabled
        className={variant === 'inline' ? 'h-8 px-3 text-xs' : undefined}
      >
        …
      </Button>
    )
  }

  const sizeProp = variant === 'inline' ? 'sm' : 'default'
  const baseCls = variant === 'inline' ? 'h-8 px-3 text-xs' : undefined

  if (state === 'incoming') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size={sizeProp}
          variant="default"
          disabled={isPending}
          onClick={() => accept.mutate({ user: summary })}
          className={baseCls}
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Accept'}
        </Button>
        <Button
          size={sizeProp}
          variant="outline"
          disabled={isPending}
          onClick={() =>
            remove.mutate({ user: summary, mode: 'decline' })
          }
          className={baseCls}
        >
          Decline
        </Button>
      </div>
    )
  }

  if (state === 'outgoing') {
    return (
      <Button
        size={sizeProp}
        variant="outline"
        disabled={isPending}
        onClick={() => remove.mutate({ user: summary, mode: 'cancel' })}
        className={cn(baseCls)}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Pending'}
      </Button>
    )
  }

  if (state === 'friend') {
    return (
      <Button
        size={sizeProp}
        variant={variant === 'ghost' ? 'ghost' : 'outline'}
        disabled={isPending}
        onClick={() => remove.mutate({ user: summary, mode: 'unfriend' })}
        className={baseCls}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Friends'}
      </Button>
    )
  }

  // 'none'
  return (
    <Button
      size={sizeProp}
      variant={variant === 'inline' ? 'outline' : 'default'}
      disabled={isPending}
      onClick={() => send.mutate({ user: summary })}
      className={baseCls}
    >
      {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Connect'}
    </Button>
  )
}

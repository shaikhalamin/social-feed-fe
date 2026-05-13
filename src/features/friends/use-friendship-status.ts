import { useAuthStore } from '@/hooks/use-auth'
import { useFriends } from './use-friends'
import { useIncomingRequests } from './use-incoming-requests'
import { useOutgoingRequests } from './use-outgoing-requests'

export type FriendshipState =
  | 'self'
  | 'none'
  | 'outgoing'
  | 'incoming'
  | 'friend'

export type FriendshipStatusResult = {
  state: FriendshipState
  isLoading: boolean
}

export function useFriendshipStatus(userId: string): FriendshipStatusResult {
  const meId = useAuthStore((s) => s.user?.id)
  const friends = useFriends()
  const incoming = useIncomingRequests()
  const outgoing = useOutgoingRequests()

  const isLoading =
    friends.isLoading || incoming.isLoading || outgoing.isLoading

  if (meId && userId === meId) return { state: 'self', isLoading: false }

  const isFriend =
    friends.data?.pages.some((page) =>
      page.data.some((f) => f.user.id === userId),
    ) ?? false
  if (isFriend) return { state: 'friend', isLoading }

  const isOutgoing =
    outgoing.data?.pages.some((page) =>
      page.data.some((r) => r.user.id === userId),
    ) ?? false
  if (isOutgoing) return { state: 'outgoing', isLoading }

  const isIncoming =
    incoming.data?.pages.some((page) =>
      page.data.some((r) => r.user.id === userId),
    ) ?? false
  if (isIncoming) return { state: 'incoming', isLoading }

  return { state: 'none', isLoading }
}

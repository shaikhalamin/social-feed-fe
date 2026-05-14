import { Link } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { PersonRow } from '@/components/friends/PersonRow'
import { useIncomingRequests } from '@/features/friends/use-incoming-requests'
import { useAcceptFriendRequest } from '@/features/friends/use-accept-friend-request'
import { useDeleteFriendRelationship } from '@/features/friends/use-delete-friend-relationship'
import { usePendingFriendshipMutationForUser } from '@/features/friends/use-pending-mutation-for-user'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'

export function FriendRequestsCard() {
  const query = useIncomingRequests()
  const requests = query.incomingRequests.slice(0, 3)
  const hasMore = query.incomingRequests.length > requests.length

  return (
    <section className="rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          Friend Requests
          {query.incomingRequests.length > 0 ? (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {query.incomingRequests.length}
            </span>
          ) : null}
        </h2>
        <Link
          to="/friend-requests"
          className="text-xs text-muted-foreground hover:underline"
        >
          See All
        </Link>
      </div>
      {query.isLoading ? (
        <div className="space-y-3">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError && !query.data ? (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load requests.
        </p>
      ) : requests.length === 0 ? (
        <p className="text-xs text-muted-foreground">No new requests.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.user.id}>
              <RequestRow request={r} />
            </li>
          ))}
          {hasMore ? (
            <li className="pt-1 text-center">
              <Link
                to="/friend-requests"
                className="text-xs text-muted-foreground hover:underline"
              >
                View all {query.incomingRequests.length}
              </Link>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  )
}

function RequestRow({ request }: { request: FriendRequest }) {
  const accept = useAcceptFriendRequest()
  const remove = useDeleteFriendRelationship()
  const isPending = usePendingFriendshipMutationForUser(request.user.id)

  return (
    <div className="space-y-2">
      <PersonRow
        user={request.user}
        avatarSize="sm"
        profileLinkUserId={request.user.id}
      />
      <div className="flex items-center gap-1.5 pl-11">
        <Button
          size="sm"
          variant="default"
          disabled={isPending}
          onClick={() => accept.mutate({ user: request.user })}
          className="h-7 flex-1 px-2.5 text-xs"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Accept'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => remove.mutate({ user: request.user, mode: 'decline' })}
          className="h-7 flex-1 px-2.5 text-xs"
        >
          Decline
        </Button>
      </div>
    </div>
  )
}

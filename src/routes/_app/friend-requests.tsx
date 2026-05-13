import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { FriendRequestRow } from '@/components/friends/FriendRequestRow'
import { useIncomingRequests } from '@/features/friends/use-incoming-requests'
import { useOutgoingRequests } from '@/features/friends/use-outgoing-requests'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'

export const Route = createFileRoute('/_app/friend-requests')({
  component: FriendRequestsPage,
})

function FriendRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Friend requests</h1>
      </div>
      <IncomingSection />
      <OutgoingSection />
    </div>
  )
}

function IncomingSection() {
  const query = useIncomingRequests()
  const sentinelRef = useInfiniteScrollSentinel(query)

  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        Incoming
      </h2>
      {query.isLoading ? (
        <div className="space-y-4">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError && !query.data ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load incoming requests.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : query.incomingRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No incoming requests right now.
        </p>
      ) : (
        <div className="space-y-4">
          {query.incomingRequests.map((r) => (
            <FriendRequestRow key={r.user.id} request={r} kind="incoming" />
          ))}
          {query.isFetchingNextPage ? (
            <FriendsSkeletonRow />
          ) : query.isError ? (
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
              >
                Retry
              </Button>
            </div>
          ) : !query.hasNextPage ? (
            <p className="text-center text-xs text-muted-foreground">
              No more incoming requests
            </p>
          ) : null}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </div>
      )}
    </section>
  )
}

function OutgoingSection() {
  const query = useOutgoingRequests()
  const sentinelRef = useInfiniteScrollSentinel(query)

  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        Outgoing
      </h2>
      {query.isLoading ? (
        <div className="space-y-4">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError && !query.data ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load outgoing requests.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : query.outgoingRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t sent any requests.
        </p>
      ) : (
        <div className="space-y-4">
          {query.outgoingRequests.map((r) => (
            <FriendRequestRow key={r.user.id} request={r} kind="outgoing" />
          ))}
          {query.isFetchingNextPage ? (
            <FriendsSkeletonRow />
          ) : query.isError ? (
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
              >
                Retry
              </Button>
            </div>
          ) : !query.hasNextPage ? (
            <p className="text-center text-xs text-muted-foreground">
              No more outgoing requests
            </p>
          ) : null}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </div>
      )}
    </section>
  )
}

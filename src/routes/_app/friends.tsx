import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { PersonRow } from '@/components/friends/PersonRow'
import { FriendshipButton } from '@/components/friends/FriendshipButton'
import { useFriends } from '@/features/friends/use-friends'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'

export const Route = createFileRoute('/_app/friends')({
  component: FriendsPage,
})

function FriendsPage() {
  const query = useFriends()
  const sentinelRef = useInfiniteScrollSentinel(query)

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Your friends</h1>
      </div>
      {query.isLoading ? (
        <div className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError && !query.data ? (
        <div className="rounded-lg bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load friends. Try again.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : query.friends.length === 0 ? (
        <div className="rounded-lg bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any friends yet. Try connecting with someone
            from the suggestions in the sidebar.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
          {query.friends.map((f) => (
            <PersonRow
              key={f.user.id}
              user={f.user}
              profileLinkUserId={f.user.id}
              action={<FriendshipButton user={f.user} variant="ghost" />}
            />
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
              You&apos;ve seen all your friends
            </p>
          ) : null}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </div>
      )}
    </div>
  )
}

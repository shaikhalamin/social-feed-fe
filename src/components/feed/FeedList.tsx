import { Button } from '@/components/ui/button'
import { useFeed } from '@/features/feed/use-feed'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'
import { FeedSkeletonCard } from './FeedSkeletonCard'
import { PostCard } from './PostCard'

export function FeedList() {
  const query = useFeed()
  const sentinelRef = useInfiniteScrollSentinel(query)

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <FeedSkeletonCard />
        <FeedSkeletonCard />
        <FeedSkeletonCard />
      </div>
    )
  }

  if (query.isError && !query.data) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load feed. Try again.
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
    )
  }

  if (query.posts.length === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No posts yet. Be the first to share something!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {query.posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {query.isFetchingNextPage ? (
        <FeedSkeletonCard />
      ) : query.isError ? (
        <div className="rounded-lg bg-card p-4 text-center shadow-sm">
          <button
            type="button"
            onClick={() => void query.fetchNextPage()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Couldn&apos;t load more. Retry.
          </button>
        </div>
      ) : !query.hasNextPage ? (
        <p className="text-center text-xs text-muted-foreground">
          You&apos;re all caught up
        </p>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { FeedSkeletonCard } from '@/components/feed/FeedSkeletonCard'
import { PostCard } from '@/components/feed/PostCard'
import { useUserPosts } from '@/features/friends/use-user-posts'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'

type Props = {
  userId: string
  emptyCopy?: string
}

export function UserPostsList({
  userId,
  emptyCopy = "This user hasn't posted yet.",
}: Props) {
  const query = useUserPosts(userId)
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
          Couldn&apos;t load posts. Try again.
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
        <p className="text-sm text-muted-foreground">{emptyCopy}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {query.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {query.isFetchingNextPage ? (
        <FeedSkeletonCard />
      ) : query.isError ? (
        <div className="rounded-lg bg-card p-4 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t load more.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.fetchNextPage()}
          >
            Retry
          </Button>
        </div>
      ) : !query.hasNextPage ? (
        <p className="text-center text-xs text-muted-foreground">
          No more posts
        </p>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </div>
  )
}

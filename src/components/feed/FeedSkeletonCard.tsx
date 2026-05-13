export function FeedSkeletonCard() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading post"
      className="rounded-lg bg-card p-6 shadow-sm"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-1/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
          <div className="h-2 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-2 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}

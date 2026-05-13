export function FriendsSkeletonRow() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading person"
      className="flex items-center gap-3"
    >
      <div className="size-10 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}

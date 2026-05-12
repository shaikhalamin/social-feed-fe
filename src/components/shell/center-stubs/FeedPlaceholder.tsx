export function FeedPlaceholder() {
  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-2 w-1/5 rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full rounded bg-muted" />
          <div className="h-2 w-11/12 rounded bg-muted" />
          <div className="h-2 w-3/4 rounded bg-muted" />
        </div>
        <div className="h-48 w-full rounded-md bg-muted" />
        <p className="pt-2 text-center text-sm text-muted-foreground">
          Feed list arrives in Phase C.
        </p>
      </div>
    </div>
  )
}

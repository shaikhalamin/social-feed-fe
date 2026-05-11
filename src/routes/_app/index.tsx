import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/")({
  component: FeedPlaceholder,
})

function FeedPlaceholder() {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">Feed</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Feed coming soon — list rendering and infinite scroll arrive in the
        next phase.
      </p>
    </div>
  )
}

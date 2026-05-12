import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/friend-requests")({
  component: FriendRequestsPlaceholder,
})

function FriendRequestsPlaceholder() {
  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Friend requests</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Incoming and outgoing requests will appear here in Phase C.
      </p>
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/hooks/use-auth'
import { ProfileHeader } from '@/components/friends/ProfileHeader'
import { UserPostsList } from '@/components/friends/UserPostsList'
import { FeedSkeletonCard } from '@/components/feed/FeedSkeletonCard'
import { useUser } from '@/features/friends/use-user'
import { ApiError } from '@/lib/api-error'

export const Route = createFileRoute('/_app/users/$userId')({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { userId } = Route.useParams()
  const meId = useAuthStore((s) => s.user?.id)
  const userQuery = useUser(userId)

  if (userQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="size-20 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
        <FeedSkeletonCard />
      </div>
    )
  }

  if (userQuery.isError) {
    const is404 =
      userQuery.error instanceof ApiError && userQuery.error.status === 404
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          {is404 ? 'User not found.' : "Couldn't load profile. Try again."}
        </p>
      </div>
    )
  }

  const user = userQuery.data?.data
  if (!user) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    )
  }

  const isSelf = meId === user.id
  const emptyCopy = isSelf
    ? "You haven't posted yet."
    : "This user hasn't posted yet."

  return (
    <div className="space-y-6">
      <ProfileHeader user={user} />
      <UserPostsList userId={user.id} emptyCopy={emptyCopy} />
    </div>
  )
}

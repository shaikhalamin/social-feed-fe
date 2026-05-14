import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { FriendshipButton } from '@/components/friends/FriendshipButton'
import { useSuggestedUsers } from '@/features/friends/use-suggested-users'

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

export function YouMightLikeCard() {
  const query = useSuggestedUsers()
  const user = query.users.at(3)

  return (
    <section className="rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">You Might Like</h2>
        <button
          type="button"
          onClick={() => toast.info('Browse all coming soon')}
          className="text-xs text-muted-foreground hover:underline"
        >
          See All
        </button>
      </div>
      {query.isLoading ? (
        <FriendsSkeletonRow />
      ) : query.isError ? (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load suggestions.
        </p>
      ) : !user ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : (
        <div className="flex flex-col items-center text-center">
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            className="hover:opacity-80"
          >
            <Avatar className="size-16">
              {user.avatarUrl ? (
                <AvatarImage
                  src={user.avatarUrl}
                  alt={`${user.firstName} ${user.lastName}`}
                />
              ) : null}
              <AvatarFallback>
                {userInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            className="mt-2 text-sm font-medium hover:underline"
          >
            {user.firstName} {user.lastName}
          </Link>
          <div className="mt-3 flex w-full items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info('Ignore coming soon')}
              className="h-8 flex-1 px-3 text-xs"
            >
              Ignore
            </Button>
            <FriendshipButton
              user={user}
              variant="inline"
              className="flex-1"
            />
          </div>
        </div>
      )}
    </section>
  )
}

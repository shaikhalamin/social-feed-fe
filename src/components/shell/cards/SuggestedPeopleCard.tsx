import { toast } from '@/components/ui/sonner'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { FriendshipButton } from '@/components/friends/FriendshipButton'
import { PersonRow } from '@/components/friends/PersonRow'
import { useSuggestedUsers } from '@/features/friends/use-suggested-users'

export function SuggestedPeopleCard() {
  const query = useSuggestedUsers()
  const users = query.users.slice(0, 3)

  return (
    <section className="rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Suggested People</h2>
        <button
          type="button"
          onClick={() => toast.info('Browse all coming soon')}
          className="text-xs text-muted-foreground hover:underline"
        >
          See All
        </button>
      </div>
      {query.isLoading ? (
        <div className="space-y-3">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError ? (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load suggestions.
        </p>
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id}>
              <PersonRow
                user={u}
                avatarSize="sm"
                profileLinkUserId={u.id}
                action={<FriendshipButton user={u} variant="inline" />}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

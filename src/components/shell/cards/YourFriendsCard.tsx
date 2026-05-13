import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { PersonRow } from '@/components/friends/PersonRow'
import { useFriends } from '@/features/friends/use-friends'

export function YourFriendsCard() {
  const [query, setQuery] = useState('')
  const friendsQuery = useFriends()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    toast.info('Search coming soon')
  }

  return (
    <section className="rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your Friends</h2>
        <Link
          to="/friends"
          className="text-xs text-muted-foreground hover:underline"
        >
          See All
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends"
            className="w-full rounded-full bg-muted px-9 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      </form>
      <ScrollArea className="max-h-[420px]">
        {friendsQuery.isLoading ? (
          <div className="space-y-3">
            <FriendsSkeletonRow />
            <FriendsSkeletonRow />
            <FriendsSkeletonRow />
          </div>
        ) : friendsQuery.isError && !friendsQuery.data ? (
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t load friends.
          </p>
        ) : friendsQuery.friends.length === 0 ? (
          <p className="text-xs text-muted-foreground">No friends yet.</p>
        ) : (
          <ul className="space-y-3">
            {friendsQuery.friends.map((f) => (
              <li key={f.user.id}>
                <PersonRow
                  user={f.user}
                  avatarSize="sm"
                  profileLinkUserId={f.user.id}
                />
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </section>
  )
}

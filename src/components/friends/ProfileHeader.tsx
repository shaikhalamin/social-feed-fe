import { MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { FriendshipButton } from './FriendshipButton'
import type { User } from '@/gen/api/types/User.ts'

type Props = {
  user: User
}

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

export function ProfileHeader({ user }: Props) {
  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const initials = userInitials(user.firstName, user.lastName)
  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar className="size-20">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={fullName} />
          ) : null}
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{fullName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <FriendshipButton user={user} variant="primary" />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => toast.info('Messaging coming soon')}
          >
            <MessageCircle className="mr-2 size-4" />
            Message
          </Button>
        </div>
      </div>
    </div>
  )
}

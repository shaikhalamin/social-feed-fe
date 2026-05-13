import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'

type Props = {
  user: UserSummary
  /** When provided, the avatar + name area becomes a router Link to /users/$userId. */
  profileLinkUserId?: string
  avatarSize?: 'sm' | 'md' | 'lg'
  action?: ReactNode
  className?: string
}

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

const AVATAR_CLASS: Record<NonNullable<Props['avatarSize']>, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

export function PersonRow({
  user,
  profileLinkUserId,
  avatarSize = 'md',
  action,
  className,
}: Props) {
  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const initials = userInitials(user.firstName, user.lastName)
  const inner = (
    <>
      <Avatar className={AVATAR_CLASS[avatarSize]}>
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={fullName} />
        ) : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {fullName}
      </span>
    </>
  )
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {profileLinkUserId ? (
        <Link
          to="/users/$userId"
          params={{ userId: profileLinkUserId }}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md hover:opacity-80"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
      )}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

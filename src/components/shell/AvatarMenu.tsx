import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/hooks/use-auth'
import { logoutCurrentDevice } from '@/lib/auth'
import { DeleteAccountDialog } from './DeleteAccountDialog'

function initials(first?: string | null, last?: string | null): string {
  const a = first?.[0]?.toUpperCase() ?? ''
  const b = last?.[0]?.toUpperCase() ?? ''
  return a + b || '?'
}

export function AvatarMenu() {
  const user = useAuthStore((s) => s.user)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : ''

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="inline-flex items-center gap-2 rounded-full p-0.5 hover:bg-accent"
            disabled={!user}
          >
            <Avatar className="size-9">
              <AvatarImage
                src={user?.avatarUrl ?? undefined}
                alt={fullName || 'User'}
              />
              <AvatarFallback>
                {initials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[260px]">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {fullName || 'Anonymous'}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.email ?? ''}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem asChild>
              <Link to="/users/$userId" params={{ userId: user.id }}>
                Profile
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>Profile</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => toast.info('Settings coming soon')}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void logoutCurrentDevice()
            }}
          >
            Logout
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setDeleteOpen(true)
            }}
            disabled={!user}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  )
}

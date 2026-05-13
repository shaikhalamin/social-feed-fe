import { useState } from 'react'
import { Globe2, Lock, MoreHorizontal, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/hooks/use-auth'
import { useDeletePostMutation } from '@/features/feed/use-delete-post'
import { useUpdatePostVisibilityMutation } from '@/features/feed/use-update-post-visibility'
import type { Post } from '@/gen/api/types/Post.ts'

type Props = { post: Post }

export function PostOwnerMenu({ post }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const visibility = useUpdatePostVisibilityMutation()
  const remove = useDeletePostMutation()

  if (currentUserId !== post.author.id) return null

  const isPrivate = post.visibility === 'private'
  const flipTo = isPrivate ? 'public' : 'private'
  const flipLabel = isPrivate ? 'Make public' : 'Make private'
  const FlipIcon = isPrivate ? Globe2 : Lock

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Post actions"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => {
              visibility.mutate({
                id: post.id,
                data: { visibility: flipTo },
              })
            }}
          >
            <FlipIcon className="size-4" />
            {flipLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                remove.mutate({ id: post.id })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

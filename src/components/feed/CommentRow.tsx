import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Comment } from '@/gen/api/types/Comment.ts'

function authorInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

type Props = {
  comment: Comment
  pending?: boolean
}

export function CommentRow({ comment, pending = false }: Props) {
  const fullName =
    `${comment.author.firstName} ${comment.author.lastName}`.trim()
  return (
    <div className={cn('flex gap-2', pending && 'opacity-70')}>
      <Avatar size="sm">
        <AvatarImage src={comment.author.avatarUrl ?? undefined} alt={fullName} />
        <AvatarFallback>
          {authorInitials(comment.author.firstName, comment.author.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <div className="text-sm font-semibold">{fullName}</div>
          <div className="whitespace-pre-line text-sm">{comment.content}</div>
        </div>
        <div className="mt-1 px-3 text-xs text-muted-foreground">
          {formatTimeAgo(comment.createdAt)}
        </div>
      </div>
    </div>
  )
}

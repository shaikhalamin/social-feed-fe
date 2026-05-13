import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToggleCommentLike } from '@/features/feed/use-toggle-comment-like'
import type { Comment } from '@/gen/api/types/Comment.ts'
import { LikesPreviewHoverCard } from './LikesPreviewHoverCard'

type Props = {
  comment: Comment
  postId: string
}

export function CommentLikeButton({ comment, postId }: Props) {
  const { toggle, isPending } = useToggleCommentLike(postId)
  const liked = comment.viewerState.liked
  const pending = isPending(comment.id)
  const count = comment.counters.likes

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <button
        type="button"
        onClick={() => toggle(comment)}
        disabled={pending}
        aria-label={liked ? 'Unlike comment' : 'Like comment'}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium hover:bg-muted',
          liked ? 'text-red-500' : 'text-muted-foreground',
        )}
      >
        <Heart className={cn('size-3.5', liked && 'fill-red-500')} />
      </button>
      {count > 0 ? (
        <LikesPreviewHoverCard
          kind="comment"
          id={comment.id}
          embedded={comment.likesPreview}
        >
          <span className="cursor-default text-muted-foreground">{count}</span>
        </LikesPreviewHoverCard>
      ) : null}
    </div>
  )
}

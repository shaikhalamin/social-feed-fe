import { Heart, MessageCircle, Share2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { Post } from '@/gen/api/types/Post.ts'
import { useTogglePostLike } from '@/features/feed/use-toggle-post-like'

type Props = {
  post: Post
  onFocusComment: () => void
}

export function PostCardReactions({ post, onFocusComment }: Props) {
  const { toggle, isPending } = useTogglePostLike()
  const liked = post.viewerState.liked
  const pending = isPending(post.id)

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => toggle(post)}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted',
          liked ? 'text-red-500' : 'text-muted-foreground',
        )}
      >
        <Heart className={cn('size-4', liked && 'fill-red-500')} />
        Like
      </button>
      <button
        type="button"
        onClick={onFocusComment}
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <MessageCircle className="size-4" />
        Comment
      </button>
      <button
        type="button"
        onClick={() => toast.info('Share coming soon')}
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Share2 className="size-4" />
        Share
      </button>
    </div>
  )
}

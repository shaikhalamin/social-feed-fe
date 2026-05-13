import { Heart } from 'lucide-react'
import type { Post } from '@/gen/api/types/Post.ts'

type Props = {
  post: Post
}

export function PostCardCounters({ post }: Props) {
  const { likes, comments } = post.counters
  if (likes === 0 && comments === 0) return null

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        {likes > 0 ? (
          <>
            <Heart className="size-3.5 fill-red-500 text-red-500" />
            <span>{likes}</span>
          </>
        ) : null}
      </div>
      <div>
        {comments > 0 ? `${comments} Comment${comments === 1 ? '' : 's'}` : null}
      </div>
    </div>
  )
}

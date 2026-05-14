import { useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { formatTimeAgo } from '@/lib/format'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { Post } from '@/gen/api/types/Post.ts'
import { CommentComposer } from './CommentComposer'
import { CommentList } from './CommentList'
import { PostCardCounters } from './PostCardCounters'
import { PostCardReactions } from './PostCardReactions'
import { PostImageGrid } from './PostImageGrid'
import { PostOwnerMenu } from './PostOwnerMenu'

function authorInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

type Props = {
  post: Post & { commentsPreview?: Comment[] }
}

export function PostCard({ post }: Props) {
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const focusComment = () => {
    commentInputRef.current?.focus()
  }

  const fullName = `${post.author.firstName} ${post.author.lastName}`.trim()

  return (
    <article className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarImage
            src={post.author.avatarUrl ?? undefined}
            alt={fullName}
          />
          <AvatarFallback>
            {authorInitials(post.author.firstName, post.author.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{fullName}</div>
          <div className="text-xs text-muted-foreground">
            {formatTimeAgo(post.createdAt)}
          </div>
        </div>
        <PostOwnerMenu post={post} />
      </div>

      {post.content.length > 0 ? (
        <p className="whitespace-pre-line text-sm">{post.content}</p>
      ) : null}

      {post.images.length > 0 ? <PostImageGrid images={post.images} /> : null}

      <PostCardCounters post={post} />

      <Separator />

      <PostCardReactions post={post} onFocusComment={focusComment} />

      <div className="space-y-3">
        <CommentComposer postId={post.id} ref={commentInputRef} />
        <CommentList
          postId={post.id}
          commentCount={post.counters.comments}
          initialPreview={post.commentsPreview}
        />
      </div>
    </article>
  )
}

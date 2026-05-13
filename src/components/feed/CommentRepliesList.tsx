import { useState, useMemo } from 'react'
import { ChevronDown, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useListCommentReplies } from '@/features/feed/use-list-comment-replies'
import { CommentRow } from './CommentRow'

type Props = {
  postId: string
  parentCommentId: string
  replyCount: number
}

export function CommentRepliesList({
  postId,
  parentCommentId,
  replyCount,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const query = useListCommentReplies(
    { postId, parentCommentId },
    { enabled: expanded },
  )

  const replies = query.replies
  const skeletonCount = useMemo(
    () => Math.min(3, Math.max(1, replyCount)),
    [replyCount],
  )

  if (replyCount === 0 && replies.length === 0) return null

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-1 inline-flex items-center gap-1.5 pl-10 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <CornerDownRight className="size-3.5" />
        View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-3">
      {query.isLoading
        ? Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="ml-10 h-12 animate-pulse rounded-2xl bg-muted/60"
            />
          ))
        : replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              postId={postId}
              isReply
            />
          ))}
      {query.hasNextPage ? (
        <div className="pl-10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="h-auto px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            <ChevronDown className="mr-1 size-3.5" />
            {query.isFetchingNextPage ? 'Loading…' : 'Show more replies'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

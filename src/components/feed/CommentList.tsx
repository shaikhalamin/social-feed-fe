import { useMemo } from 'react'
import { useMutationState } from '@tanstack/react-query'
import { createCommentMutationKey } from '@/gen/api/hooks/useCreateComment.ts'
import { usePostComments } from '@/features/feed/use-post-comments'
import { CommentRow } from './CommentRow'

type Props = {
  postId: string
  commentCount: number
}

function pickTempId(context: unknown): string | undefined {
  if (typeof context !== 'object' || context === null) return undefined
  if (!('tempId' in context)) return undefined
  const val = context.tempId
  return typeof val === 'string' ? val : undefined
}

export function CommentList({ postId, commentCount }: Props) {
  const enabled = commentCount > 0
  const query = usePostComments(postId, enabled)

  const pendingTempIds = useMutationState({
    filters: {
      mutationKey: createCommentMutationKey(),
      status: 'pending',
    },
    select: (m) => pickTempId(m.state.context),
  })

  const pendingIds = useMemo(
    () => new Set(pendingTempIds.filter((id): id is string => Boolean(id))),
    [pendingTempIds],
  )

  if (!enabled) return null

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (query.isError && !query.data) {
    return (
      <button
        type="button"
        onClick={() => void query.refetch()}
        className="text-xs text-primary hover:underline"
      >
        Couldn&apos;t load comments. Retry.
      </button>
    )
  }

  const remaining = Math.max(0, commentCount - query.comments.length)

  return (
    <div className="space-y-3">
      {query.comments.map((c) => (
        <CommentRow
          key={c.id}
          comment={c}
          postId={postId}
          pending={pendingIds.has(c.id)}
        />
      ))}
      {query.hasNextPage ? (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {query.isFetchingNextPage
            ? 'Loading…'
            : remaining > 0
              ? `View ${remaining} more comment${remaining === 1 ? '' : 's'}`
              : 'View more comments'}
        </button>
      ) : null}
    </div>
  )
}

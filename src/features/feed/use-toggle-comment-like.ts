import { useLikeComment } from '@/gen/api/hooks/useLikeComment.ts'
import { useUnlikeComment } from '@/gen/api/hooks/useUnlikeComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { GetCommentLikesPreviewQueryResponse } from '@/gen/api/types/GetCommentLikesPreview.ts'
import type { ReactionUserSummary } from '@/gen/api/types/ReactionUserSummary.ts'
import type { CommentCacheTuple } from './feed-cache'
import {
  cancelCommentCachesForPost,
  patchCommentInAllCaches,
  patchCommentLike,
  patchLikesPreviewAddViewer,
  patchLikesPreviewRemoveViewer,
  restoreCommentCaches,
} from './feed-cache'

export function commentLikesPreviewQueryKey(commentId: string) {
  return ['comment-likes-preview', commentId] as const
}

type ToggleContext = {
  commentSnapshots: CommentCacheTuple[]
  previewSnapshot: GetCommentLikesPreviewQueryResponse | undefined
  liked: boolean
}

function getViewerSummary(): ReactionUserSummary | null {
  const user = useAuthStore.getState().user
  if (!user) return null
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

async function runOptimisticToggle(
  postId: string,
  commentId: string,
  liked: boolean,
): Promise<ToggleContext> {
  const viewer = getViewerSummary()
  const previewKey = commentLikesPreviewQueryKey(commentId)
  await Promise.all([
    cancelCommentCachesForPost(queryClient, postId),
    queryClient.cancelQueries({ queryKey: previewKey }),
  ])
  const commentSnapshots = viewer
    ? patchCommentInAllCaches(queryClient, postId, commentId, (c) =>
        patchCommentLike(c, liked, viewer),
      )
    : []
  const previewSnapshot =
    queryClient.getQueryData<GetCommentLikesPreviewQueryResponse>(previewKey)
  if (viewer) {
    queryClient.setQueryData<GetCommentLikesPreviewQueryResponse>(
      previewKey,
      (prev) =>
        prev
          ? {
              data: liked
                ? patchLikesPreviewAddViewer(prev.data, viewer)
                : patchLikesPreviewRemoveViewer(prev.data, viewer.id),
            }
          : prev,
    )
  }
  return { commentSnapshots, previewSnapshot, liked }
}

function restoreToggle(
  commentId: string,
  context: ToggleContext | undefined,
): void {
  if (!context) return
  restoreCommentCaches(queryClient, context.commentSnapshots)
  queryClient.setQueryData<GetCommentLikesPreviewQueryResponse>(
    commentLikesPreviewQueryKey(commentId),
    context.previewSnapshot,
  )
}

export function useToggleCommentLike(postId: string) {
  const like = useLikeComment<ToggleContext>({
    mutation: {
      onMutate: ({ comment_id }) =>
        runOptimisticToggle(postId, comment_id, true),
      onError: (_err, vars, context) => {
        restoreToggle(vars.comment_id, context)
        toast.error("Couldn't update like")
      },
    },
  })

  const unlike = useUnlikeComment<ToggleContext>({
    mutation: {
      onMutate: ({ comment_id }) =>
        runOptimisticToggle(postId, comment_id, false),
      onError: (_err, vars, context) => {
        restoreToggle(vars.comment_id, context)
        toast.error("Couldn't update like")
      },
    },
  })

  const toggle = (comment: Comment) => {
    if (comment.viewerState.liked) {
      unlike.mutate({ comment_id: comment.id })
    } else {
      like.mutate({ comment_id: comment.id })
    }
  }

  const isPending = (commentId: string): boolean => {
    if (like.isPending && like.variables.comment_id === commentId) return true
    if (unlike.isPending && unlike.variables.comment_id === commentId)
      return true
    return false
  }

  return { toggle, isPending }
}

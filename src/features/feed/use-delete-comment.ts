import { useDeleteComment } from '@/gen/api/hooks/useDeleteComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { commentsQueryKey } from './use-post-comments'
import type { CommentCacheTuple, PostListSnapshot } from './feed-cache'
import {
  bumpCommentReplyCount,
  cancelCommentCachesForPost,
  cancelPostListQueries,
  findCommentInAllCaches,
  patchAllPostListCaches,
  patchCommentInAllCaches,
  removeCommentFromAllCaches,
  restoreCommentCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type DeleteCommentContext = {
  removeSnapshots: CommentCacheTuple[]
  parentCounterSnapshots: CommentCacheTuple[]
  postListSnapshot: PostListSnapshot
}

export function useDeleteCommentMutation(postId: string) {
  return useDeleteComment<DeleteCommentContext>({
    mutation: {
      onMutate: async ({ id }) => {
        await Promise.all([
          cancelCommentCachesForPost(queryClient, postId),
          cancelPostListQueries(queryClient),
        ])
        const found = findCommentInAllCaches(queryClient, postId, id)
        const parentId = found?.comment.parentCommentId ?? null
        const removeSnapshots = removeCommentFromAllCaches(
          queryClient,
          postId,
          id,
        )
        const parentCounterSnapshots: CommentCacheTuple[] = parentId
          ? patchCommentInAllCaches(queryClient, postId, parentId, (c) =>
              bumpCommentReplyCount(c, -1),
            )
          : []
        const postListSnapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, postId, (p) => ({
          ...p,
          counters: {
            ...p.counters,
            comments: Math.max(0, p.counters.comments - 1),
          },
        }))
        return { removeSnapshots, parentCounterSnapshots, postListSnapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          restoreCommentCaches(queryClient, context.removeSnapshots)
          restoreCommentCaches(queryClient, context.parentCounterSnapshots)
          restorePostListCaches(queryClient, context.postListSnapshot)
        }
        toast.error("Couldn't delete comment")
      },
    },
  })
}

// Keep commentsQueryKey re-export for any callers that still use it.
export { commentsQueryKey }

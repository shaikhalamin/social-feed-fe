import { useDeleteComment } from '@/gen/api/hooks/useDeleteComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { commentsQueryKey } from './use-post-comments'
import type { CommentPages, PostListSnapshot } from './feed-cache'
import {
  cancelPostListQueries,
  patchAllPostListCaches,
  removeCommentFromList,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type DeleteCommentContext = {
  previousComments: CommentPages | undefined
  postListSnapshot: PostListSnapshot
}

export function useDeleteCommentMutation(postId: string) {
  return useDeleteComment<DeleteCommentContext>({
    mutation: {
      onMutate: async ({ id }) => {
        const commentsKey = commentsQueryKey(postId)
        await Promise.all([
          queryClient.cancelQueries({ queryKey: commentsKey }),
          cancelPostListQueries(queryClient),
        ])
        const previousComments =
          queryClient.getQueryData<CommentPages>(commentsKey)
        const postListSnapshot = snapshotPostListCaches(queryClient)
        queryClient.setQueryData<CommentPages>(commentsKey, (pages) =>
          removeCommentFromList(pages, id),
        )
        patchAllPostListCaches(queryClient, postId, (p) => ({
          ...p,
          counters: {
            ...p.counters,
            comments: Math.max(0, p.counters.comments - 1),
          },
        }))
        return { previousComments, postListSnapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<CommentPages>(
            commentsQueryKey(postId),
            context.previousComments,
          )
          restorePostListCaches(queryClient, context.postListSnapshot)
        }
        toast.error("Couldn't delete comment")
      },
    },
  })
}

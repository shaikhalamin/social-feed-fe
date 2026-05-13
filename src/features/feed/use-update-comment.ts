import { useUpdateComment } from '@/gen/api/hooks/useUpdateComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { CommentCacheTuple } from './feed-cache'
import {
  cancelCommentCachesForPost,
  patchCommentInAllCaches,
  restoreCommentCaches,
} from './feed-cache'

type UpdateCommentContext = { snapshots: CommentCacheTuple[] }

export function useUpdateCommentMutation(postId: string) {
  return useUpdateComment<UpdateCommentContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        await cancelCommentCachesForPost(queryClient, postId)
        const nowIso = new Date().toISOString()
        const snapshots = patchCommentInAllCaches(
          queryClient,
          postId,
          id,
          (c) => ({
            ...c,
            content: data.content,
            isEdited: true,
            updatedAt: nowIso,
          }),
        )
        return { snapshots }
      },
      onError: (_err, _vars, context) => {
        if (context) restoreCommentCaches(queryClient, context.snapshots)
        toast.error("Couldn't update comment")
      },
    },
  })
}

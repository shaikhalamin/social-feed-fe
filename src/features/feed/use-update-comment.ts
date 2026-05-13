import { useUpdateComment } from '@/gen/api/hooks/useUpdateComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { commentsQueryKey } from './use-post-comments'
import type { CommentPages } from './feed-cache'
import { patchCommentInList } from './feed-cache'

type UpdateCommentContext = { previous: CommentPages | undefined }

export function useUpdateCommentMutation(postId: string) {
  return useUpdateComment<UpdateCommentContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        const key = commentsQueryKey(postId)
        await queryClient.cancelQueries({ queryKey: key })
        const previous = queryClient.getQueryData<CommentPages>(key)
        const nowIso = new Date().toISOString()
        queryClient.setQueryData<CommentPages>(key, (pages) =>
          patchCommentInList(pages, id, (c) => ({
            ...c,
            content: data.content,
            isEdited: true,
            updatedAt: nowIso,
          })),
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<CommentPages>(
            commentsQueryKey(postId),
            context.previous,
          )
        }
        toast.error("Couldn't update comment")
      },
    },
  })
}

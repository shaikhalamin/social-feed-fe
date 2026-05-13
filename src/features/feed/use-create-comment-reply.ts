import { useCreateCommentReply } from '@/gen/api/hooks/useCreateCommentReply.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { CommentCacheTuple, CommentPages } from './feed-cache'
import {
  bumpCommentReplyCount,
  cancelCommentCachesForPost,
  patchCommentInAllCaches,
  patchCommentInList,
  prependReplyToPages,
  restoreCommentCaches,
} from './feed-cache'

export function repliesQueryKey(postId: string, parentCommentId: string) {
  return ['comments', postId, 'replies', parentCommentId, 'infinite'] as const
}

type ReplyContext = {
  tempId: string
  replyKey: ReturnType<typeof repliesQueryKey>
  previousReplies: CommentPages | undefined
  parentCounterSnapshots: CommentCacheTuple[]
}

function buildOptimisticReply(
  postId: string,
  parentCommentId: string,
  content: string,
  tempId: string,
): Comment | null {
  const user = useAuthStore.getState().user
  if (!user) return null
  const nowIso = new Date().toISOString()
  return {
    id: tempId,
    postId,
    parentCommentId,
    author: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
    content,
    counters: { likes: 0, replies: 0 },
    viewerState: { liked: false },
    likesPreview: { count: 0, preview: [] },
    isEdited: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

function replaceReplyInFirstPage(
  pages: CommentPages | undefined,
  tempId: string,
  next: Comment,
): CommentPages | undefined {
  if (!pages || pages.pages.length === 0) return pages
  const [first, ...rest] = pages.pages
  if (!first.data.some((c) => c.id === tempId)) return pages
  return {
    ...pages,
    pages: [
      {
        ...first,
        data: first.data.map((c) => (c.id === tempId ? next : c)),
      },
      ...rest,
    ],
  }
}

export function useCreateCommentReplyMutation(
  postId: string,
  parentCommentId: string,
) {
  return useCreateCommentReply<ReplyContext>({
    mutation: {
      onMutate: async ({ data }) => {
        const replyKey = repliesQueryKey(postId, parentCommentId)
        await cancelCommentCachesForPost(queryClient, postId)
        const tempId = crypto.randomUUID()
        const tempReply = buildOptimisticReply(
          postId,
          parentCommentId,
          data.content,
          tempId,
        )
        const previousReplies =
          queryClient.getQueryData<CommentPages>(replyKey)
        if (tempReply) {
          queryClient.setQueryData<CommentPages>(replyKey, (pages) =>
            prependReplyToPages(pages, tempReply),
          )
        }
        const parentCounterSnapshots = patchCommentInAllCaches(
          queryClient,
          postId,
          parentCommentId,
          (c) => bumpCommentReplyCount(c, 1),
        )
        return { tempId, replyKey, previousReplies, parentCounterSnapshots }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<CommentPages>(
            context.replyKey,
            context.previousReplies,
          )
          restoreCommentCaches(queryClient, context.parentCounterSnapshots)
        }
        toast.error("Couldn't post reply")
      },
      onSuccess: (response, _vars, context) => {
        queryClient.setQueryData<CommentPages>(context.replyKey, (pages) =>
          replaceReplyInFirstPage(pages, context.tempId, response.data),
        )
      },
    },
  })
}

// Re-export the local helper so other modules can compose against the key.
export { patchCommentInList }

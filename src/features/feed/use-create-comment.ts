import type { InfiniteData } from '@tanstack/react-query'
import { useCreateComment } from '@/gen/api/hooks/useCreateComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { ListCommentsQueryResponse } from '@/gen/api/types/ListComments.ts'
import { commentsQueryKey } from './use-post-comments'
import { feedQueryKey } from './use-feed'
import type { FeedPages } from './feed-cache'
import { bumpPostCommentCount } from './feed-cache'

type CommentsPages = InfiniteData<
  ListCommentsQueryResponse,
  string | undefined
>

type CommentContext = {
  tempId: string
  previousComments: CommentsPages | undefined
  previousFeed: FeedPages | undefined
}

const EMPTY_COMMENTS_PAGINATION: ListCommentsQueryResponse['pagination'] = {
  nextCursor: null,
  hasNext: false,
  limit: 3,
}

function buildOptimisticComment(
  postId: string,
  content: string,
  tempId: string,
): Comment | null {
  const user = useAuthStore.getState().user
  if (!user) return null
  const nowIso = new Date().toISOString()
  return {
    id: tempId,
    postId,
    parentCommentId: null,
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

function prependCommentToPages(
  pages: CommentsPages | undefined,
  comment: Comment,
): CommentsPages {
  if (!pages || pages.pages.length === 0) {
    return {
      pages: [{ data: [comment], pagination: EMPTY_COMMENTS_PAGINATION }],
      pageParams: [undefined],
    }
  }
  const [first, ...rest] = pages.pages
  const updatedFirst: ListCommentsQueryResponse = {
    ...first,
    data: [comment, ...first.data],
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

function replaceCommentInFirstPage(
  pages: CommentsPages | undefined,
  tempId: string,
  next: Comment,
): CommentsPages | undefined {
  if (!pages || pages.pages.length === 0) return pages
  const [first, ...rest] = pages.pages
  if (!first.data.some((c) => c.id === tempId)) return pages
  const updatedFirst: ListCommentsQueryResponse = {
    ...first,
    data: first.data.map((c) => (c.id === tempId ? next : c)),
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

export function useCreateCommentMutation(postId: string) {
  return useCreateComment<CommentContext>({
    mutation: {
      onMutate: async ({ data }) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: commentsQueryKey(postId) }),
          queryClient.cancelQueries({ queryKey: feedQueryKey }),
        ])
        const tempId = crypto.randomUUID()
        const tempComment = buildOptimisticComment(postId, data.content, tempId)
        const previousComments = queryClient.getQueryData<CommentsPages>(
          commentsQueryKey(postId),
        )
        const previousFeed = queryClient.getQueryData<FeedPages>(feedQueryKey)
        if (tempComment) {
          queryClient.setQueryData<CommentsPages>(
            commentsQueryKey(postId),
            (pages) => prependCommentToPages(pages, tempComment),
          )
          queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
            bumpPostCommentCount(pages, postId, +1),
          )
        }
        return { tempId, previousComments, previousFeed }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<CommentsPages>(
            commentsQueryKey(postId),
            context.previousComments,
          )
          queryClient.setQueryData<FeedPages>(
            feedQueryKey,
            context.previousFeed,
          )
        }
        toast.error("Couldn't post comment")
      },
      onSuccess: (response, _vars, context) => {
        queryClient.setQueryData<CommentsPages>(
          commentsQueryKey(postId),
          (pages) =>
            replaceCommentInFirstPage(pages, context.tempId, response.data),
        )
      },
    },
  })
}

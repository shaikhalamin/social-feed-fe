import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { listComments } from '@/gen/api/clients/listComments.ts'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { ListCommentsQueryResponse } from '@/gen/api/types/ListComments.ts'

export function commentsQueryKey(postId: string) {
  return ['comments', postId, 'infinite'] as const
}

export function usePostComments(postId: string, enabled: boolean) {
  const query = useInfiniteQuery<
    ListCommentsQueryResponse,
    Error,
    {
      pages: ListCommentsQueryResponse[]
      pageParams: Array<string | undefined>
    },
    ReturnType<typeof commentsQueryKey>,
    string | undefined
  >({
    queryKey: commentsQueryKey(postId),
    queryFn: ({ pageParam }) =>
      listComments({
        post_id: postId,
        params: { limit: 3, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    enabled,
  })

  const comments = useMemo<Comment[]>(
    () =>
      (query.data?.pages.flatMap((p) => p.data) ?? []).filter(
        (c) => c.parentCommentId === null,
      ),
    [query.data],
  )

  return { ...query, comments }
}

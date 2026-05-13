import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { listCommentReplies } from '@/gen/api/clients/listCommentReplies.ts'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { ListCommentRepliesQueryResponse } from '@/gen/api/types/ListCommentReplies.ts'
import { repliesQueryKey } from './use-create-comment-reply'

type Params = {
  postId: string
  parentCommentId: string
}

type Options = {
  enabled: boolean
}

export function useListCommentReplies(
  { postId, parentCommentId }: Params,
  { enabled }: Options,
) {
  const query = useInfiniteQuery<
    ListCommentRepliesQueryResponse,
    Error,
    {
      pages: ListCommentRepliesQueryResponse[]
      pageParams: Array<string | undefined>
    },
    ReturnType<typeof repliesQueryKey>,
    string | undefined
  >({
    queryKey: repliesQueryKey(postId, parentCommentId),
    queryFn: ({ pageParam }) =>
      listCommentReplies({
        comment_id: parentCommentId,
        params: { limit: 5, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    enabled,
  })

  const replies = useMemo<Comment[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, replies }
}

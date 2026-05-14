import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { listComments } from '@/gen/api/clients/listComments.ts'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { ListCommentsQueryResponse } from '@/gen/api/types/ListComments.ts'

export function commentsQueryKey(postId: string) {
  return ['comments', postId, 'infinite'] as const
}

type InfinitePages = {
  pages: ListCommentsQueryResponse[]
  pageParams: Array<string | undefined>
}

export function usePostComments(
  postId: string,
  enabled: boolean,
  initialPreview?: Comment[],
  totalCount?: number,
) {
  const initialData = useMemo<InfinitePages | undefined>(() => {
    if (!initialPreview || initialPreview.length === 0) return undefined
    const total = totalCount ?? initialPreview.length
    return {
      pages: [
        {
          data: initialPreview,
          pagination: {
            nextCursor: null,
            hasNext: total > initialPreview.length,
            limit: initialPreview.length,
          },
        },
      ],
      pageParams: [undefined],
    }
  }, [initialPreview, totalCount])

  const query = useInfiniteQuery<
    ListCommentsQueryResponse,
    Error,
    InfinitePages,
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
    ...(initialData
      ? { initialData, initialDataUpdatedAt: () => Date.now() }
      : {}),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    enabled,
  })

  const comments = useMemo<Comment[]>(() => {
    const seen = new Set<string>()
    const out: Comment[] = []
    const pages = query.data?.pages ?? []
    for (const page of pages) {
      for (const c of page.data) {
        if (c.parentCommentId !== null) continue
        if (seen.has(c.id)) continue
        seen.add(c.id)
        out.push(c)
      }
    }
    return out
  }, [query.data])

  return { ...query, comments }
}

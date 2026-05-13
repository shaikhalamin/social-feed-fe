import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query'
import type { GetFeedQueryResponse } from '@/gen/api/types/GetFeed.ts'
import type { Post } from '@/gen/api/types/Post.ts'

export type PostListResponse = {
  data: Post[]
  pagination: {
    nextCursor: string | null
    hasNext: boolean
    limit: number
  }
}

export type PostPages<TResponse extends PostListResponse = PostListResponse> =
  InfiniteData<TResponse, string | undefined>

export type FeedPages = PostPages<GetFeedQueryResponse>

const EMPTY_PAGINATION: GetFeedQueryResponse['pagination'] = {
  nextCursor: null,
  hasNext: false,
  limit: 20,
}

export function prependPostToFeed(
  pages: FeedPages | undefined,
  post: Post,
): FeedPages {
  if (!pages || pages.pages.length === 0) {
    return {
      pages: [{ data: [post], pagination: EMPTY_PAGINATION }],
      pageParams: [undefined],
    }
  }
  const [first, ...rest] = pages.pages
  const updatedFirst: GetFeedQueryResponse = {
    ...first,
    data: [post, ...first.data],
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

export function patchPostInPages<TResponse extends PostListResponse>(
  pages: PostPages<TResponse> | undefined,
  postId: string,
  patch: (p: Post) => Post,
): PostPages<TResponse> | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((p) => p.id === postId),
  )
  if (!exists) return pages
  const nextPages = pages.pages.map((page) => {
    if (!page.data.some((p) => p.id === postId)) return page
    return {
      ...page,
      data: page.data.map((p) => (p.id === postId ? patch(p) : p)),
    }
  })
  return { ...pages, pages: nextPages }
}

// Backwards-compatible alias for the Phase C type / call sites.
export const patchPostInFeed = patchPostInPages<GetFeedQueryResponse>

export function bumpPostCommentCount<TResponse extends PostListResponse>(
  pages: PostPages<TResponse> | undefined,
  postId: string,
  delta: number,
): PostPages<TResponse> | undefined {
  return patchPostInPages(pages, postId, (p) => ({
    ...p,
    counters: { ...p.counters, comments: p.counters.comments + delta },
  }))
}

function isPostListQueryKey(key: QueryKey): boolean {
  if (!Array.isArray(key)) return false
  return key[0] === 'feed' || key[0] === 'user-posts'
}

export type PostListSnapshot = Array<[QueryKey, PostPages | undefined]>

export function snapshotPostListCaches(
  queryClient: QueryClient,
): PostListSnapshot {
  return queryClient.getQueriesData<PostPages>({
    predicate: (q) => isPostListQueryKey(q.queryKey),
  })
}

export function patchAllPostListCaches(
  queryClient: QueryClient,
  postId: string,
  patch: (p: Post) => Post,
): void {
  const queries = queryClient.getQueriesData<PostPages>({
    predicate: (q) => isPostListQueryKey(q.queryKey),
  })
  for (const [key] of queries) {
    queryClient.setQueryData<PostPages>(key, (pages) =>
      patchPostInPages(pages, postId, patch),
    )
  }
}

export function restorePostListCaches(
  queryClient: QueryClient,
  snapshot: PostListSnapshot,
): void {
  for (const [key, data] of snapshot) {
    queryClient.setQueryData<PostPages>(key, data)
  }
}

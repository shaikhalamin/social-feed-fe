import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { GetFeedQueryResponse } from '@/gen/api/types/GetFeed.ts'
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'
import type { ListCommentsQueryResponse } from '@/gen/api/types/ListComments.ts'
import type { Post } from '@/gen/api/types/Post.ts'
import type { ReactionUserSummary } from '@/gen/api/types/ReactionUserSummary.ts'

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

export function cancelPostListQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.cancelQueries({
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

export function removePostFromPages<TResponse extends PostListResponse>(
  pages: PostPages<TResponse> | undefined,
  postId: string,
): PostPages<TResponse> | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((p) => p.id === postId),
  )
  if (!exists) return pages
  const nextPages = pages.pages.map((page) =>
    page.data.some((p) => p.id === postId)
      ? { ...page, data: page.data.filter((p) => p.id !== postId) }
      : page,
  )
  return { ...pages, pages: nextPages }
}

export function removePostFromAllPostListCaches(
  queryClient: QueryClient,
  postId: string,
): void {
  const queries = queryClient.getQueriesData<PostPages>({
    predicate: (q) => isPostListQueryKey(q.queryKey),
  })
  for (const [key] of queries) {
    queryClient.setQueryData<PostPages>(key, (pages) =>
      removePostFromPages(pages, postId),
    )
  }
}

export type CommentPages = InfiniteData<
  ListCommentsQueryResponse,
  string | undefined
>

export function patchCommentInList(
  pages: CommentPages | undefined,
  commentId: string,
  patch: (c: Comment) => Comment,
): CommentPages | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((c) => c.id === commentId),
  )
  if (!exists) return pages
  const nextPages = pages.pages.map((page) =>
    page.data.some((c) => c.id === commentId)
      ? {
          ...page,
          data: page.data.map((c) => (c.id === commentId ? patch(c) : c)),
        }
      : page,
  )
  return { ...pages, pages: nextPages }
}

export function removeCommentFromList(
  pages: CommentPages | undefined,
  commentId: string,
): CommentPages | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((c) => c.id === commentId),
  )
  if (!exists) return pages
  const nextPages = pages.pages.map((page) =>
    page.data.some((c) => c.id === commentId)
      ? { ...page, data: page.data.filter((c) => c.id !== commentId) }
      : page,
  )
  return { ...pages, pages: nextPages }
}

const LIKES_PREVIEW_CAP = 5

export function patchCommentLike(
  comment: Comment,
  liked: boolean,
  viewer: ReactionUserSummary,
): Comment {
  const prevLiked = comment.viewerState.liked
  if (prevLiked === liked) return comment
  const nextLikes = liked
    ? comment.counters.likes + 1
    : Math.max(0, comment.counters.likes - 1)
  const nextPreview = liked
    ? patchLikesPreviewAddViewer(comment.likesPreview, viewer)
    : patchLikesPreviewRemoveViewer(comment.likesPreview, viewer.id)
  return {
    ...comment,
    viewerState: { ...comment.viewerState, liked },
    counters: { ...comment.counters, likes: nextLikes },
    likesPreview: nextPreview,
  }
}

export function bumpCommentReplyCount(
  comment: Comment,
  delta: 1 | -1,
): Comment {
  const nextReplies =
    delta === 1
      ? comment.counters.replies + 1
      : Math.max(0, comment.counters.replies - 1)
  return {
    ...comment,
    counters: { ...comment.counters, replies: nextReplies },
  }
}

export function patchLikesPreviewAddViewer(
  preview: LikesPreview,
  viewer: ReactionUserSummary,
): LikesPreview {
  const withoutViewer = preview.preview.filter((p) => p.id !== viewer.id)
  const nextPreview = [viewer, ...withoutViewer].slice(0, LIKES_PREVIEW_CAP)
  const alreadyIn = preview.preview.some((p) => p.id === viewer.id)
  return {
    count: alreadyIn ? preview.count : preview.count + 1,
    preview: nextPreview,
  }
}

export function patchLikesPreviewRemoveViewer(
  preview: LikesPreview,
  viewerId: string,
): LikesPreview {
  const alreadyOut = !preview.preview.some((p) => p.id === viewerId)
  const nextPreview = preview.preview.filter((p) => p.id !== viewerId)
  return {
    count: alreadyOut ? preview.count : Math.max(0, preview.count - 1),
    preview: nextPreview,
  }
}

export function prependReplyToPages(
  pages: CommentPages | undefined,
  reply: Comment,
): CommentPages {
  const emptyPagination: ListCommentsQueryResponse['pagination'] = {
    nextCursor: null,
    hasNext: false,
    limit: 20,
  }
  if (!pages || pages.pages.length === 0) {
    return {
      pages: [{ data: [reply], pagination: emptyPagination }],
      pageParams: [undefined],
    }
  }
  const [first, ...rest] = pages.pages
  const updatedFirst: ListCommentsQueryResponse = {
    ...first,
    data: [reply, ...first.data],
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

export type CommentCacheTuple = readonly [QueryKey, CommentPages | undefined]

function isCommentCacheKey(postId: string, key: QueryKey): boolean {
  if (!Array.isArray(key)) return false
  if (key[0] !== 'comments' || key[1] !== postId) return false
  // Either ['comments', postId, 'infinite'] or
  // ['comments', postId, 'replies', commentId, 'infinite']
  return (
    (key.length === 3 && key[2] === 'infinite') ||
    (key.length === 5 && key[2] === 'replies' && key[4] === 'infinite')
  )
}

export function findCommentInAllCaches(
  queryClient: QueryClient,
  postId: string,
  commentId: string,
): { key: QueryKey; comment: Comment } | null {
  const entries = queryClient.getQueriesData<CommentPages>({
    predicate: (q) => isCommentCacheKey(postId, q.queryKey),
  })
  for (const [key, pages] of entries) {
    if (!pages) continue
    for (const page of pages.pages) {
      const found = page.data.find((c) => c.id === commentId)
      if (found) return { key, comment: found }
    }
  }
  return null
}

export function patchCommentInAllCaches(
  queryClient: QueryClient,
  postId: string,
  commentId: string,
  patch: (c: Comment) => Comment,
): CommentCacheTuple[] {
  const entries = queryClient.getQueriesData<CommentPages>({
    predicate: (q) => isCommentCacheKey(postId, q.queryKey),
  })
  const snapshots: CommentCacheTuple[] = []
  for (const [key, pages] of entries) {
    const contains = pages?.pages.some((page) =>
      page.data.some((c) => c.id === commentId),
    )
    if (!contains) continue
    snapshots.push([key, pages])
    queryClient.setQueryData<CommentPages>(key, (prev) =>
      patchCommentInList(prev, commentId, patch),
    )
  }
  return snapshots
}

export function removeCommentFromAllCaches(
  queryClient: QueryClient,
  postId: string,
  commentId: string,
): CommentCacheTuple[] {
  const entries = queryClient.getQueriesData<CommentPages>({
    predicate: (q) => isCommentCacheKey(postId, q.queryKey),
  })
  const snapshots: CommentCacheTuple[] = []
  for (const [key, pages] of entries) {
    const contains = pages?.pages.some((page) =>
      page.data.some((c) => c.id === commentId),
    )
    if (!contains) continue
    snapshots.push([key, pages])
    queryClient.setQueryData<CommentPages>(key, (prev) =>
      removeCommentFromList(prev, commentId),
    )
  }
  return snapshots
}

export function restoreCommentCaches(
  queryClient: QueryClient,
  snapshots: CommentCacheTuple[],
): void {
  for (const [key, data] of snapshots) {
    queryClient.setQueryData<CommentPages>(key, data)
  }
}

export function cancelCommentCachesForPost(
  queryClient: QueryClient,
  postId: string,
): Promise<void> {
  return queryClient.cancelQueries({
    predicate: (q) => isCommentCacheKey(postId, q.queryKey),
  })
}

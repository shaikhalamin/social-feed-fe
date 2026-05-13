import type { InfiniteData } from '@tanstack/react-query'
import type { GetFeedQueryResponse } from '@/gen/api/types/GetFeed.ts'
import type { Post } from '@/gen/api/types/Post.ts'

export type FeedPages = InfiniteData<GetFeedQueryResponse, string | undefined>

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

export function patchPostInFeed(
  pages: FeedPages | undefined,
  postId: string,
  patch: (p: Post) => Post,
): FeedPages | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) => page.data.some((p) => p.id === postId))
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

export function bumpPostCommentCount(
  pages: FeedPages | undefined,
  postId: string,
  delta: number,
): FeedPages | undefined {
  return patchPostInFeed(pages, postId, (p) => ({
    ...p,
    counters: { ...p.counters, comments: p.counters.comments + delta },
  }))
}

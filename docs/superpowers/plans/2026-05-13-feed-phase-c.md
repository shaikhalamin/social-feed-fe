# Feed (Phase C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phase B center-column placeholders with a live composer, infinite-scrolling feed, optimistic likes, and lazy inline comments — so an authenticated user can post text, scroll cursor-paginated posts, toggle likes optimistically, and read/write top-level comments inline.

**Architecture:** TanStack Query `useInfiniteQuery` wraps the generated raw clients (`getFeed`, `listComments`) since Kubb only emits `useQuery`. Mutations (`createPost`, `likePost`/`unlikePost`, `createComment`) compose generated hooks with cache patches via pure helpers in `feed-cache.ts`. Likes and comments update optimistically (snapshot in `onMutate`, rollback in `onError`, **no `onSettled` refetch**); post creation is server-confirm-then-prepend (no temp ID). Presentational components live in `src/components/feed/`; data hooks in `src/features/feed/`; one shared time-formatter helper in `src/lib/format.ts`.

**Tech Stack:** React 19, TanStack Query 5 (`useInfiniteQuery`, `useMutation`, `setQueryData`, `InfiniteData`), TanStack Router (file-based), Tailwind v4, shadcn primitives (`Avatar`, `Button`, `Separator`), `lucide-react` icons, `sonner` toasts, Zustand (`useAuthStore` only — no new stores), Kubb-generated clients/types/hooks under `src/gen/api/`.

**Spec:** `docs/superpowers/specs/2026-05-13-feed-phase-c-design.md`

**Testing note (deviation from default writing-plans):** Per the approved spec (§Testing Strategy), Phase C is gated by a manual smoke checklist instead of unit tests — consistent with Phases A and B. The surface is overwhelmingly cache-patch logic + presentational composition + one infinite-scroll observer; the spec explicitly opts out of automated tests for this phase. A final verification task runs the §Testing Strategy checklist before declaring done.

---

## File Map

**Created:**
- `src/lib/format.ts` — pure `formatTimeAgo(iso)` helper.
- `src/features/feed/feed-cache.ts` — pure cache-shape helpers (`FeedPages`, `prependPostToFeed`, `patchPostInFeed`, `bumpPostCommentCount`).
- `src/features/feed/use-feed.ts` — `useFeed()` infinite query wrapper over `getFeed`.
- `src/features/feed/use-post-comments.ts` — `usePostComments(postId, enabled)` infinite query wrapper over `listComments`.
- `src/features/feed/use-create-post.ts` — `useCreatePostMutation()` (server-confirm prepend).
- `src/features/feed/use-toggle-post-like.ts` — `useTogglePostLike()` (optimistic, picks like/unlike based on `viewerState.liked`).
- `src/features/feed/use-create-comment.ts` — `useCreateCommentMutation(postId)` (optimistic prepend + counter bump).
- `src/components/feed/Composer.tsx` — top-of-center create-post form.
- `src/components/feed/FeedList.tsx` — infinite feed list + observer sentinel + all states.
- `src/components/feed/FeedSkeletonCard.tsx` — pulsing skeleton card.
- `src/components/feed/PostCard.tsx` — composes header / content / counters / reactions / comments for one post.
- `src/components/feed/PostCardCounters.tsx` — likes + comments count strip.
- `src/components/feed/PostCardReactions.tsx` — Like / Comment / Share button row.
- `src/components/feed/CommentList.tsx` — per-post inline comments list with "View N more comments".
- `src/components/feed/CommentRow.tsx` — single comment bubble row.
- `src/components/feed/CommentComposer.tsx` — per-post inline comment textarea.

**Modified:**
- `src/routes/_app/index.tsx` — swap `ComposerPlaceholder` / `FeedPlaceholder` imports for the live `Composer` / `FeedList`.

**Deleted:**
- `src/components/shell/center-stubs/ComposerPlaceholder.tsx`
- `src/components/shell/center-stubs/FeedPlaceholder.tsx`

**Untouched:**
- `src/components/shell/center-stubs/StoriesCarousel.tsx` (Phase B — stays).
- `LeftSidebar`, `RightSidebar`, `AppHeader`, `AvatarMenu`, `FloatingThemeToggle`, all sample data in `src/data/sample-shell.ts`.
- All Kubb-generated code under `src/gen/api/**` (never hand-edited).
- All auth code (`src/features/auth/**`, `src/lib/auth.ts`, `src/hooks/use-auth.ts`).

---

## Task 1: Add `formatTimeAgo` helper

**Files:**
- Create: `src/lib/format.ts`

- [ ] **Step 1: Write `src/lib/format.ts`**

```ts
const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = MS_PER_MINUTE * 60
const MS_PER_DAY = MS_PER_HOUR * 24
const MS_PER_WEEK = MS_PER_DAY * 7

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function formatTimeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso)
  const diff = now.getTime() - then.getTime()

  if (diff < MS_PER_MINUTE) return 'just now'
  if (diff < MS_PER_HOUR) {
    const m = Math.floor(diff / MS_PER_MINUTE)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (diff < MS_PER_DAY) {
    const h = Math.floor(diff / MS_PER_HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  if (diff < MS_PER_WEEK) {
    const d = Math.floor(diff / MS_PER_DAY)
    return `${d} day${d === 1 ? '' : 's'} ago`
  }

  const month = MONTH_NAMES[then.getMonth()]
  const day = then.getDate()
  return then.getFullYear() === now.getFullYear()
    ? `${month} ${day}`
    : `${month} ${day}, ${then.getFullYear()}`
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/format.ts
git commit -m "$(cat <<'EOF'
feat(util): formatTimeAgo helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Pure feed-cache helpers

**Files:**
- Create: `src/features/feed/feed-cache.ts`

- [ ] **Step 1: Write `src/features/feed/feed-cache.ts`**

```ts
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
  let found = false
  const nextPages = pages.pages.map((page) => {
    if (!page.data.some((p) => p.id === postId)) return page
    found = true
    return {
      ...page,
      data: page.data.map((p) => (p.id === postId ? patch(p) : p)),
    }
  })
  if (!found) return pages
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/feed-cache.ts
git commit -m "$(cat <<'EOF'
feat(feed): cache mutation helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `useFeed` infinite query hook

**Files:**
- Create: `src/features/feed/use-feed.ts`

- [ ] **Step 1: Write `src/features/feed/use-feed.ts`**

```ts
import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getFeed } from '@/gen/api/clients/getFeed.ts'
import type { GetFeedQueryResponse } from '@/gen/api/types/GetFeed.ts'
import type { Post } from '@/gen/api/types/Post.ts'

export const feedQueryKey = ['feed', 'infinite'] as const

export function useFeed() {
  const query = useInfiniteQuery<
    GetFeedQueryResponse,
    Error,
    { pages: GetFeedQueryResponse[]; pageParams: Array<string | undefined> },
    typeof feedQueryKey,
    string | undefined
  >({
    queryKey: feedQueryKey,
    queryFn: ({ pageParam }) =>
      getFeed({ params: { limit: 20, cursor: pageParam } }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const posts = useMemo<Post[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, posts }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-feed.ts
git commit -m "$(cat <<'EOF'
feat(feed): useFeed infinite query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: `usePostComments` infinite query hook

**Files:**
- Create: `src/features/feed/use-post-comments.ts`

- [ ] **Step 1: Write `src/features/feed/use-post-comments.ts`**

```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-post-comments.ts
git commit -m "$(cat <<'EOF'
feat(feed): usePostComments infinite query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `useCreatePostMutation` (server-confirm prepend)

**Files:**
- Create: `src/features/feed/use-create-post.ts`

- [ ] **Step 1: Write `src/features/feed/use-create-post.ts`**

```ts
import { useCreatePost } from '@/gen/api/hooks/useCreatePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { feedQueryKey } from './use-feed'
import { prependPostToFeed, type FeedPages } from './feed-cache'

export function useCreatePostMutation() {
  return useCreatePost({
    mutation: {
      onSuccess: (response) => {
        queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
          prependPostToFeed(pages, response.data),
        )
      },
      onError: () => {
        toast.error("Couldn't post. Try again.")
      },
    },
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-create-post.ts
git commit -m "$(cat <<'EOF'
feat(feed): useCreatePostMutation prepends server-confirmed post

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `useTogglePostLike` (optimistic toggle)

**Files:**
- Create: `src/features/feed/use-toggle-post-like.ts`

- [ ] **Step 1: Write `src/features/feed/use-toggle-post-like.ts`**

```ts
import { useLikePost } from '@/gen/api/hooks/useLikePost.ts'
import { useUnlikePost } from '@/gen/api/hooks/useUnlikePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { Post } from '@/gen/api/types/Post.ts'
import { feedQueryKey } from './use-feed'
import { patchPostInFeed, type FeedPages } from './feed-cache'

type LikeContext = { previous: FeedPages | undefined }

function applyOptimisticToggle(
  pages: FeedPages | undefined,
  postId: string,
): FeedPages | undefined {
  return patchPostInFeed(pages, postId, (p) => ({
    ...p,
    viewerState: { ...p.viewerState, liked: !p.viewerState.liked },
    counters: {
      ...p.counters,
      likes: p.counters.likes + (p.viewerState.liked ? -1 : 1),
    },
  }))
}

export function useTogglePostLike() {
  const like = useLikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const previous = queryClient.getQueryData<FeedPages>(feedQueryKey)
        queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
          applyOptimisticToggle(pages, post_id),
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<FeedPages>(feedQueryKey, context.previous)
        }
        toast.error("Couldn't update like")
      },
    },
  })

  const unlike = useUnlikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const previous = queryClient.getQueryData<FeedPages>(feedQueryKey)
        queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
          applyOptimisticToggle(pages, post_id),
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<FeedPages>(feedQueryKey, context.previous)
        }
        toast.error("Couldn't update like")
      },
    },
  })

  const toggle = (post: Post) => {
    if (post.viewerState.liked) {
      unlike.mutate({ post_id: post.id })
    } else {
      like.mutate({ post_id: post.id })
    }
  }

  const isPending = (postId: string): boolean => {
    if (like.isPending && like.variables?.post_id === postId) return true
    if (unlike.isPending && unlike.variables?.post_id === postId) return true
    return false
  }

  return { toggle, isPending }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-toggle-post-like.ts
git commit -m "$(cat <<'EOF'
feat(feed): useTogglePostLike with optimistic patch and rollback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `useCreateCommentMutation` (optimistic comment + counter bump)

**Files:**
- Create: `src/features/feed/use-create-comment.ts`

- [ ] **Step 1: Write `src/features/feed/use-create-comment.ts`**

```ts
import type { InfiniteData } from '@tanstack/react-query'
import { useCreateComment } from '@/gen/api/hooks/useCreateComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { ListCommentsQueryResponse } from '@/gen/api/types/ListComments.ts'
import { commentsQueryKey } from './use-post-comments'
import { feedQueryKey } from './use-feed'
import { bumpPostCommentCount, type FeedPages } from './feed-cache'

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
      onMutate: ({ data }) => {
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
        }
        queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
          bumpPostCommentCount(pages, postId, +1),
        )
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
        if (!context) return
        queryClient.setQueryData<CommentsPages>(
          commentsQueryKey(postId),
          (pages) =>
            replaceCommentInFirstPage(pages, context.tempId, response.data),
        )
      },
    },
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-create-comment.ts
git commit -m "$(cat <<'EOF'
feat(feed): useCreateCommentMutation with optimistic prepend and rollback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `Composer` (live post composer)

**Files:**
- Create: `src/components/feed/Composer.tsx`

- [ ] **Step 1: Write `src/components/feed/Composer.tsx`**

```tsx
import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/use-auth'
import { useCreatePostMutation } from '@/features/feed/use-create-post'

const MAX_CONTENT_LENGTH = 10000

function userInitials(first: string, last: string): string {
  const f = first.trim()[0] ?? ''
  const l = last.trim()[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

export function Composer() {
  const user = useAuthStore((s) => s.user)
  const [content, setContent] = useState('')
  const mutation = useCreatePostMutation()
  const submitting = mutation.isPending
  const trimmed = content.trim()
  const canSubmit = trimmed.length > 0 && !submitting

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      { data: { content: trimmed, visibility: 'public' } },
      {
        onSuccess: () => setContent(''),
      },
    )
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ''

  return (
    <div className="rounded-lg bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar size="lg">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback>
            {user ? userInitials(user.firstName, user.lastName) : '?'}
          </AvatarFallback>
        </Avatar>
        <textarea
          value={content}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="What's on your mind?"
          maxLength={MAX_CONTENT_LENGTH}
          rows={2}
          className="flex-1 resize-none rounded-md bg-muted/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus:bg-muted focus:outline-none"
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => toast.info('Image upload coming soon')}
          aria-label="Add image"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <ImageIcon className="size-5" />
        </button>
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={!canSubmit}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Post'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/Composer.tsx
git commit -m "$(cat <<'EOF'
feat(feed): live composer

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `FeedSkeletonCard`

**Files:**
- Create: `src/components/feed/FeedSkeletonCard.tsx`

- [ ] **Step 1: Write `src/components/feed/FeedSkeletonCard.tsx`**

```tsx
export function FeedSkeletonCard() {
  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-2 w-1/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full animate-pulse rounded bg-muted" />
          <div className="h-2 w-11/12 animate-pulse rounded bg-muted" />
          <div className="h-2 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/FeedSkeletonCard.tsx
git commit -m "$(cat <<'EOF'
feat(feed): skeleton card for feed loading states

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `CommentRow`

**Files:**
- Create: `src/components/feed/CommentRow.tsx`

- [ ] **Step 1: Write `src/components/feed/CommentRow.tsx`**

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Comment } from '@/gen/api/types/Comment.ts'

function authorInitials(first: string, last: string): string {
  const f = first.trim()[0] ?? ''
  const l = last.trim()[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

type Props = {
  comment: Comment
  pending?: boolean
}

export function CommentRow({ comment, pending = false }: Props) {
  const fullName =
    `${comment.author.firstName} ${comment.author.lastName}`.trim()
  return (
    <div className={cn('flex gap-2', pending && 'opacity-70')}>
      <Avatar size="sm">
        <AvatarImage src={comment.author.avatarUrl ?? undefined} alt={fullName} />
        <AvatarFallback>
          {authorInitials(comment.author.firstName, comment.author.lastName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <div className="text-sm font-semibold">{fullName}</div>
          <div className="whitespace-pre-line text-sm">{comment.content}</div>
        </div>
        <div className="mt-1 px-3 text-xs text-muted-foreground">
          {formatTimeAgo(comment.createdAt)}
        </div>
      </div>
    </div>
  )
}
```

`pending` is read here but always populated from `CommentList` (Task 12) — `CommentList` queries the in-flight comment mutations and passes `pending={true}` for the optimistic temp row.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/CommentRow.tsx
git commit -m "$(cat <<'EOF'
feat(feed): comment row

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `CommentComposer`

**Files:**
- Create: `src/components/feed/CommentComposer.tsx`

- [ ] **Step 1: Write `src/components/feed/CommentComposer.tsx`**

```tsx
import {
  forwardRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { SendHorizonal } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/hooks/use-auth'
import { useCreateCommentMutation } from '@/features/feed/use-create-comment'

function userInitials(first: string, last: string): string {
  const f = first.trim()[0] ?? ''
  const l = last.trim()[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

type Props = {
  postId: string
}

export const CommentComposer = forwardRef<HTMLTextAreaElement, Props>(
  function CommentComposer({ postId }, ref) {
    const user = useAuthStore((s) => s.user)
    const [content, setContent] = useState('')
    const mutation = useCreateCommentMutation(postId)
    const trimmed = content.trim()
    const canSubmit = trimmed.length > 0 && !mutation.isPending

    const submit = () => {
      if (!canSubmit) return
      mutation.mutate(
        { post_id: postId, data: { content: trimmed } },
        {
          onSuccess: () => setContent(''),
        },
      )
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        submit()
      }
    }

    const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value)
    }

    const fullName = user ? `${user.firstName} ${user.lastName}`.trim() : ''

    return (
      <div className="flex items-start gap-2">
        <Avatar size="sm">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback>
            {user ? userInitials(user.firstName, user.lastName) : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-muted/60 pl-3 pr-1 py-1">
          <textarea
            ref={ref}
            value={content}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Write a comment…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            aria-label="Post comment"
            className="inline-flex size-8 items-center justify-center rounded-full text-primary disabled:text-muted-foreground"
          >
            <SendHorizonal className="size-4" />
          </button>
        </div>
      </div>
    )
  },
)
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/CommentComposer.tsx
git commit -m "$(cat <<'EOF'
feat(feed): comment composer with Cmd/Ctrl+Enter submit

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: `CommentList`

**Files:**
- Create: `src/components/feed/CommentList.tsx`

- [ ] **Step 1: Write `src/components/feed/CommentList.tsx`**

```tsx
import { useMemo } from 'react'
import { useMutationState } from '@tanstack/react-query'
import { createCommentMutationKey } from '@/gen/api/hooks/useCreateComment.ts'
import { usePostComments } from '@/features/feed/use-post-comments'
import { CommentRow } from './CommentRow'

type Props = {
  postId: string
  commentCount: number
}

function pickTempId(context: unknown): string | undefined {
  if (typeof context !== 'object' || context === null) return undefined
  const val = (context as Record<string, unknown>).tempId
  return typeof val === 'string' ? val : undefined
}

export function CommentList({ postId, commentCount }: Props) {
  const enabled = commentCount > 0
  const query = usePostComments(postId, enabled)

  const pendingTempIds = useMutationState({
    filters: {
      mutationKey: createCommentMutationKey(),
      status: 'pending',
    },
    select: (m) => pickTempId(m.state.context),
  })

  const pendingIds = useMemo(
    () => new Set(pendingTempIds.filter((id): id is string => Boolean(id))),
    [pendingTempIds],
  )

  if (!enabled) return null

  if (query.isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  if (query.isError && !query.data) {
    return (
      <button
        type="button"
        onClick={() => void query.refetch()}
        className="text-xs text-primary hover:underline"
      >
        Couldn&apos;t load comments. Retry.
      </button>
    )
  }

  const remaining = Math.max(0, commentCount - query.comments.length)
  const showLoadMore = query.hasNextPage && remaining > 0

  return (
    <div className="space-y-3">
      {query.comments.map((c) => (
        <CommentRow key={c.id} comment={c} pending={pendingIds.has(c.id)} />
      ))}
      {showLoadMore ? (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          {query.isFetchingNextPage
            ? 'Loading…'
            : `View ${remaining} more comment${remaining === 1 ? '' : 's'}`}
        </button>
      ) : null}
    </div>
  )
}
```

The `useMutationState` call collects the `tempId` from every currently-pending `createComment` mutation across the app. We then `Set.has(c.id)` per row — temp comments inserted optimistically into the cache use the same UUID we put into the mutation's context, so a temp row dims via `opacity-70` until `onSuccess` swaps in the server row (whose real UUID won't be in the pending set). `(context as Record<string, unknown>)` is narrowing a checked-`unknown` to an indexable shape — allowed under the project's "no unsafe casts" rule because we then check the runtime type of `tempId` before returning it.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/CommentList.tsx
git commit -m "$(cat <<'EOF'
feat(feed): comment list with pagination

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: `PostCardCounters`

**Files:**
- Create: `src/components/feed/PostCardCounters.tsx`

- [ ] **Step 1: Write `src/components/feed/PostCardCounters.tsx`**

```tsx
import { Heart } from 'lucide-react'
import type { Post } from '@/gen/api/types/Post.ts'

type Props = {
  post: Post
}

export function PostCardCounters({ post }: Props) {
  const { likes, comments } = post.counters
  if (likes === 0 && comments === 0) return null

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        {likes > 0 ? (
          <>
            <Heart className="size-3.5 fill-red-500 text-red-500" />
            <span>{likes}</span>
          </>
        ) : null}
      </div>
      <div>
        {comments > 0 ? `${comments} Comment${comments === 1 ? '' : 's'}` : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostCardCounters.tsx
git commit -m "$(cat <<'EOF'
feat(feed): post card counters row

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: `PostCardReactions`

**Files:**
- Create: `src/components/feed/PostCardReactions.tsx`

- [ ] **Step 1: Write `src/components/feed/PostCardReactions.tsx`**

```tsx
import { Heart, MessageCircle, Share2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { Post } from '@/gen/api/types/Post.ts'
import { useTogglePostLike } from '@/features/feed/use-toggle-post-like'

type Props = {
  post: Post
  onFocusComment: () => void
}

export function PostCardReactions({ post, onFocusComment }: Props) {
  const { toggle, isPending } = useTogglePostLike()
  const liked = post.viewerState.liked
  const pending = isPending(post.id)

  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => toggle(post)}
        disabled={pending}
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted',
          liked ? 'text-red-500' : 'text-muted-foreground',
        )}
      >
        <Heart
          className={cn('size-4', liked && 'fill-red-500')}
        />
        Like
      </button>
      <button
        type="button"
        onClick={onFocusComment}
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <MessageCircle className="size-4" />
        Comment
      </button>
      <button
        type="button"
        onClick={() => toast.info('Share coming soon')}
        className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
      >
        <Share2 className="size-4" />
        Share
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostCardReactions.tsx
git commit -m "$(cat <<'EOF'
feat(feed): post card reactions row with optimistic like

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: `PostCard`

**Files:**
- Create: `src/components/feed/PostCard.tsx`

- [ ] **Step 1: Write `src/components/feed/PostCard.tsx`**

```tsx
import { useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { formatTimeAgo } from '@/lib/format'
import type { Post } from '@/gen/api/types/Post.ts'
import { CommentComposer } from './CommentComposer'
import { CommentList } from './CommentList'
import { PostCardCounters } from './PostCardCounters'
import { PostCardReactions } from './PostCardReactions'

function authorInitials(first: string, last: string): string {
  const f = first.trim()[0] ?? ''
  const l = last.trim()[0] ?? ''
  return (f + l).toUpperCase() || '?'
}

type Props = {
  post: Post
}

export function PostCard({ post }: Props) {
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const focusComment = () => {
    commentInputRef.current?.focus()
  }

  const fullName = `${post.author.firstName} ${post.author.lastName}`.trim()

  return (
    <article className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarImage src={post.author.avatarUrl ?? undefined} alt={fullName} />
          <AvatarFallback>
            {authorInitials(post.author.firstName, post.author.lastName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-semibold">{fullName}</div>
          <div className="text-xs text-muted-foreground">
            {formatTimeAgo(post.createdAt)}
          </div>
        </div>
      </div>

      <p className="whitespace-pre-line text-sm">{post.content}</p>

      <PostCardCounters post={post} />

      <Separator />

      <PostCardReactions post={post} onFocusComment={focusComment} />

      <div className="space-y-3">
        <CommentComposer postId={post.id} ref={commentInputRef} />
        <CommentList postId={post.id} commentCount={post.counters.comments} />
      </div>
    </article>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostCard.tsx
git commit -m "$(cat <<'EOF'
feat(feed): post card composing all sub-components

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: `FeedList` (infinite scroll + all states)

**Files:**
- Create: `src/components/feed/FeedList.tsx`

- [ ] **Step 1: Write `src/components/feed/FeedList.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useFeed } from '@/features/feed/use-feed'
import { FeedSkeletonCard } from './FeedSkeletonCard'
import { PostCard } from './PostCard'

export function FeedList() {
  const query = useFeed()
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (
        entry?.isIntersecting &&
        query.hasNextPage &&
        !query.isFetchingNextPage &&
        !query.isFetching
      ) {
        void query.fetchNextPage()
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [
    query.hasNextPage,
    query.isFetchingNextPage,
    query.isFetching,
    query.fetchNextPage,
  ])

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <FeedSkeletonCard />
        <FeedSkeletonCard />
        <FeedSkeletonCard />
      </div>
    )
  }

  if (query.isError && !query.data) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load feed. Try again.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => void query.refetch()}
        >
          Retry
        </Button>
      </div>
    )
  }

  if (query.posts.length === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          No posts yet. Be the first to share something!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {query.posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
      {query.isFetchingNextPage ? <FeedSkeletonCard /> : null}
      {query.isError && query.data ? (
        <div className="rounded-lg bg-card p-4 text-center shadow-sm">
          <button
            type="button"
            onClick={() => void query.fetchNextPage()}
            className="text-sm font-medium text-primary hover:underline"
          >
            Couldn&apos;t load more. Retry.
          </button>
        </div>
      ) : null}
      {!query.hasNextPage && !query.isFetchingNextPage ? (
        <p className="text-center text-xs text-muted-foreground">
          You&apos;re all caught up
        </p>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/FeedList.tsx
git commit -m "$(cat <<'EOF'
feat(feed): infinite feed list with all states

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: Wire the route + remove Phase B placeholders

**Files:**
- Modify: `src/routes/_app/index.tsx`
- Delete: `src/components/shell/center-stubs/ComposerPlaceholder.tsx`
- Delete: `src/components/shell/center-stubs/FeedPlaceholder.tsx`

- [ ] **Step 1: Replace `src/routes/_app/index.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { StoriesCarousel } from '@/components/shell/center-stubs/StoriesCarousel'
import { Composer } from '@/components/feed/Composer'
import { FeedList } from '@/components/feed/FeedList'

export const Route = createFileRoute('/_app/')({
  component: AppIndex,
})

function AppIndex() {
  return (
    <div className="space-y-6">
      <StoriesCarousel />
      <Composer />
      <FeedList />
    </div>
  )
}
```

- [ ] **Step 2: Verify nothing else imports the placeholders before deletion**

Use Grep across the repo for both `ComposerPlaceholder` and `FeedPlaceholder`. After Step 1, the only remaining matches should be the two files themselves. If any other file imports them, fix that file first.

- [ ] **Step 3: Delete the Phase B placeholders**

```bash
git rm src/components/shell/center-stubs/ComposerPlaceholder.tsx src/components/shell/center-stubs/FeedPlaceholder.tsx
```

- [ ] **Step 4: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass with `0 errors, 0 warnings`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/_app/index.tsx
git commit -m "$(cat <<'EOF'
feat(routes): wire live composer and feed; remove Phase B placeholders

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(The `git rm` in Step 3 already staged the deletions; Step 5 stages the modified route file and commits everything together.)

---

## Task 18: Manual smoke gate

This task is gating, not coding. Run every check from the spec's §Testing Strategy below. If a step fails, fix it (small tweaks to Tailwind classes or component behavior) before moving on. Only the visual-tweak commit at the end is conditional — all 20 functional checks must pass.

**Pre-req:**
- A known test account (Phase A login works).
- Backend on `http://localhost:8787` seeded with another user that has posts.
- `pnpm dev` running on `http://localhost:3000`.

- [ ] **Step 1: Typecheck + lint clean**

```bash
pnpm typecheck && pnpm lint
```
Expected: both `0 errors, 0 warnings`.

- [ ] **Step 2: Dev server clean**

```bash
pnpm dev
```
Expected: no console errors, no missing-asset 404s, React Query Devtools mounted.

- [ ] **Step 3: Cold-boot logged in**

Open `http://localhost:3000/`. Expected: three-column shell renders (Phase B regression check). Center column shows stories + composer + feed.

- [ ] **Step 4: Empty feed**

Log in as a brand-new user with no friends and no posts. Center column shows "No posts yet…" empty state under the composer.

- [ ] **Step 5: Compose a post**

Type `Hello from Phase C 🎉` and click **Post**. Within ~1s the post appears as the top item with current user's name, avatar, and "just now" timestamp. Textarea clears. No console errors.

- [ ] **Step 6: Compose with Cmd/Ctrl+Enter**

Type, press `Cmd+Enter` (macOS) or `Ctrl+Enter` (Windows/Linux). Post submits. Plain `Enter` inserts a newline.

- [ ] **Step 7: Compose validation**

Whitespace-only text → **Post** button disabled. Paste >10000 chars → textarea caps at 10000 (browser `maxLength`).

- [ ] **Step 8: Compose failure**

Stop the backend. Click **Post**. Text remains in the textarea; error toast appears. Restart backend and click **Post** again → succeeds.

- [ ] **Step 9: Like a post**

Click the heart on any post. Icon turns filled red instantly; counter increments. Click again → reverts instantly. Refresh page → server state matches.

- [ ] **Step 10: Like failure**

Stop backend, click heart → flips instantly then snaps back ~100ms later, error toast appears. Restart backend, retry → succeeds.

- [ ] **Step 11: Comment-fetch lazy gate**

Open Network tab. A feed with N posts, M with ≥1 comment → exactly M `listComments` requests fire on first paint; none for the (N−M) zero-comment posts.

- [ ] **Step 12: Post a comment**

Type into a post's comment composer, press `Cmd/Ctrl+Enter`. Comment appears inline immediately at opacity-70. After ~300ms it becomes fully opaque (replaced by server result). Post's "N Comment" counter ticks up. No console errors.

- [ ] **Step 13: Comment pagination**

Find a post with >3 comments. First 3 show with **View N more comments** button. Click → next page appends, button label updates with new remainder, or disappears when none remain.

- [ ] **Step 14: Comment failure**

Stop backend, post a comment → it appears, then disappears ~100ms later; error toast appears; composer keeps text. Restart backend, retry → succeeds.

- [ ] **Step 15: Infinite scroll**

Scroll near the bottom of the feed. A `FeedSkeletonCard` appears briefly while the next page loads. Subsequent pages append without duplicating earlier posts. When server returns `hasNext: false`, a muted "You're all caught up" line replaces the sentinel.

- [ ] **Step 16: Feed initial fetch error**

Start frontend with backend offline. Centered "Couldn't load feed" card + Retry button. Bring backend up, click **Retry** → feed loads.

- [ ] **Step 17: Visual parity at 1440px**

Open `sample_screens/feed.html` in a second tab. Compare center column post card layout: header row, content, counters row, reactions row, comments section. Tweak Tailwind classes per-component until materially indistinguishable. Common tweaks: card spacing (~16–24px between sections), heart-icon color (red `#ef4444` when liked), comment bubble background (`bg-muted`).

- [ ] **Step 18: Dark mode**

Toggle theme via the floating button. Composer, post card, comment bubbles, skeleton bars, error states all render legibly — no white-on-white surprises.

- [ ] **Step 19: Logout regression**

Open avatar menu → **Logout** → redirects to `/auth/login`. Re-login → lands back on `/`, feed reloads. No stale cache leakage across users.

- [ ] **Step 20: Multi-tab regression**

Open two tabs at `/`. Post in tab 1 → tab 2 does **not** auto-update (intentional — no real-time). Refresh tab 2 → new post is present.

- [ ] **Step 21: Optional visual-tweak commit**

If step 17 required Tailwind tweaks, commit them now:

```bash
git add -- src/components/feed
git commit -m "$(cat <<'EOF'
fix(feed): visual tweaks from smoke pass

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no tweaks were needed, skip this step.

---

## Verification checklist

Before declaring Phase C done:
- `pnpm typecheck` exits 0.
- `pnpm lint` exits 0 with no warnings.
- All 20 functional smoke checks above pass.
- `git status` is clean (no stray files).
- Phase B placeholders (`ComposerPlaceholder.tsx`, `FeedPlaceholder.tsx`) are gone; `StoriesCarousel.tsx` remains.

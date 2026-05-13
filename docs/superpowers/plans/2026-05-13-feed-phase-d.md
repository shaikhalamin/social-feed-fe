# Feed (Phase D) — Sidebar & Friends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire every friend-related affordance to the real backend — replace sidebar `SAMPLE_*` data with live `listUsers` / `listFriends`, ship three new routes (`/friends`, `/friend-requests` rewrite, `/users/$userId`), and add a state-aware `FriendshipButton` that drives optimistic `send` / `accept` / `delete` mutations across the app.

**Architecture:** Pure helpers in `friends-cache.ts` (mirror of `feed-cache.ts`) snapshot + patch three infinite caches — friends, incoming requests, outgoing requests — on every optimistic mutation, with rollback in `onError`. A composed `useFriendshipStatus(userId)` hook derives a 5-state discriminated union from the three list caches; `FriendshipButton` renders the matching label and fires the matching mutation. The reused `PostCard` from Phase C requires a small extension to Phase C's like/comment caches so optimistic updates fan out to the new per-user post caches. Generic infinite-scroll sentinel logic is extracted from `FeedList` into a shared hook before the four new infinite lists consume it.

**Tech Stack:** React 19, TanStack Query 5 (`useInfiniteQuery`, `useQuery`, `useMutation`, `useMutationState`, `setQueryData`, `getQueriesData`, `InfiniteData`), TanStack Router (file-based, dynamic `$userId` segment), Tailwind v4, shadcn primitives (`Avatar`, `Button`, `Separator`, `DropdownMenu`, `ScrollArea`), `lucide-react` icons, `sonner` toasts, Zustand (`useAuthStore` only), Kubb-generated clients / mutation hooks / types under `src/gen/api/`.

**Spec:** `docs/superpowers/specs/2026-05-13-feed-phase-d-design.md`

**Testing note (deviation from default writing-plans):** Per the approved spec (§Testing Strategy and §Non-Goals), Phase D is gated by a manual smoke checklist instead of unit tests — consistent with Phases A / B / C. The final task runs the §Testing Strategy checklist before declaring done. `pnpm typecheck` and `pnpm lint` exit 0 after every commit.

---

## File Map

**Created:**
- `src/lib/is-conflict-error.ts` — type guard for 409 detection on `ApiError`.
- `src/lib/use-infinite-scroll-sentinel.ts` — generic `IntersectionObserver` hook extracted from `FeedList`, returns a `ref<HTMLDivElement>` and fires `query.fetchNextPage()` on intersection.
- `src/features/friends/friends-cache.ts` — pure cache helpers + `FriendsPages` / `RequestsPages` aliases.
- `src/features/friends/use-friends.ts` — `useFriends()` infinite query over `listFriends` + `friendsQueryKey`.
- `src/features/friends/use-incoming-requests.ts` — `useIncomingRequests()` + `incomingRequestsQueryKey`.
- `src/features/friends/use-outgoing-requests.ts` — `useOutgoingRequests()` + `outgoingRequestsQueryKey`.
- `src/features/friends/use-suggested-users.ts` — `useSuggestedUsers()` non-infinite over `listUsers({ page: 1, limit: 4 })` + `suggestedUsersQueryKey`.
- `src/features/friends/use-user.ts` — `useUser(userId)` query over `getUser` + `userQueryKey`.
- `src/features/friends/use-user-posts.ts` — `useUserPosts(userId)` infinite query over `listPostsByUser` + `userPostsQueryKey`.
- `src/features/friends/use-friendship-status.ts` — composes the three list hooks + auth store, returns `{ state, isLoading }`.
- `src/features/friends/use-send-friend-request.ts` — wraps generated `useSendFriendRequest`, optimistic prepend to outgoing cache + 409 reconcile.
- `src/features/friends/use-accept-friend-request.ts` — wraps generated `useAcceptFriendRequest`, optimistic remove from incoming + prepend to friends + 409 reconcile.
- `src/features/friends/use-delete-friend-relationship.ts` — wraps generated `useDeleteFriendRelationship`, mode-branched optimistic remove.
- `src/components/friends/PersonRow.tsx` — shared avatar + name + optional `linkTo` + optional action slot.
- `src/components/friends/FriendsSkeletonRow.tsx` — pulsing row-shaped skeleton.
- `src/components/friends/FriendshipButton.tsx` — 5-state button driven by `useFriendshipStatus` + mutations + `useMutationState` for pending dim.
- `src/components/friends/FriendRequestRow.tsx` — `PersonRow` with Accept+Decline or Cancel actions.
- `src/components/friends/ProfileHeader.tsx` — avatar (xl) + name + `FriendshipButton` + placeholder Message button.
- `src/components/friends/UserPostsList.tsx` — infinite list of `PostCard` for `/users/$userId`.
- `src/routes/_app/friends.tsx` — `/friends` page.
- `src/routes/_app/users.$userId.tsx` — `/users/$userId` dynamic route.

**Modified:**
- `src/features/feed/feed-cache.ts` — generalize `patchPostInFeed` over any `{ data: Post[]; pagination: ... }` infinite response; add `snapshotPostListCaches` + `patchAllPostListCaches` + `restorePostListCaches` helpers that fan out across `['feed', 'infinite']` and every `['user-posts', userId, 'infinite']` cache.
- `src/features/feed/use-toggle-post-like.ts` — switch from single-cache patch to `patchAllPostListCaches` / `restorePostListCaches`.
- `src/features/feed/use-create-comment.ts` — fan out the `+1` / `-1` comment-counter bump to all post-list caches.
- `src/components/feed/FeedList.tsx` — replace inline `IntersectionObserver` `useEffect` with `useInfiniteScrollSentinel(query)`.
- `src/routes/_app/friend-requests.tsx` — full rewrite: Incoming + Outgoing sections.
- `src/components/shell/cards/YourFriendsCard.tsx` — swap `SAMPLE_FRIENDS` for `useFriends().friends`; drop presence dot rendering; convert chat row to non-action `<PersonRow linkTo>`; "See All" → `<Link to="/friends">`; search bar stays toast.
- `src/components/shell/cards/SuggestedPeopleCard.tsx` — swap `SAMPLE_SUGGESTED_PEOPLE` for `useSuggestedUsers().users.slice(0, 3)`; row → `<PersonRow action={<FriendshipButton variant="inline" />}>`.
- `src/components/shell/cards/YouMightLikeCard.tsx` — swap `SAMPLE_YOU_MIGHT_LIKE` for `useSuggestedUsers().users[3]`; Follow → `<FriendshipButton variant="primary" />`; Ignore stays toast.
- `src/components/shell/AvatarMenu.tsx` — replace "Profile" `toast.info` with `<Link to="/users/$userId" params={{ userId }}>` guarded by `user`.
- `src/data/sample-shell.ts` — delete `SamplePerson`, `SAMPLE_SUGGESTED_PEOPLE`, `SAMPLE_YOU_MIGHT_LIKE`, `FriendStatus`, `SampleFriend`, `SAMPLE_FRIENDS`. Keep all other exports.

**Untouched:**
- Phase A auth, Phase B shell, Phase C feed/composer/comments end-user logic.
- `src/gen/api/**` (regenerated, never hand-edited).
- `HeaderNavLinks.tsx` — already routes `/friend-requests`.
- `StoriesCarousel`, `EventsCard`, `Notifications*`, `Explore*`, `Search` (no backend in Phase D scope).

---

## Conventions

- **No semicolons, single quotes, trailing commas.** Match `src/routes/_app/index.tsx` (Phase C) over `src/routes/_app.tsx` (Phase A — uses double quotes inconsistently).
- **Imports use `.ts` extensions** for files under `@/gen/api/` (per existing usage). Internal feature modules also keep extensions where Phase C does — match the directory's existing style.
- **`import type`** for any type-only import (required by `verbatimModuleSyntax`).
- **No `any`, no `as any`, no `!`, no eslint/ts disable** (per CLAUDE.md). Narrow with `instanceof`, `in`, or type guards.
- **Toast import:** `import { toast } from '@/components/ui/sonner'`. Failure → `toast.error("Couldn't …")`; unwired stub → `toast.info('… coming soon')`; **no success toasts**.
- **Per-file `userInitials` helper** (not shared) — matches Phase C pattern. Two-letter initials, fallback `'?'`.
- **Query-key style:** `[domain, ...optional, 'infinite'] as const` for infinite, `[domain, ...optional] as const` for non-infinite. Exported alongside the hook.
- **Optimistic-mutation protocol** (mirror Phase C exactly):
  1. `await queryClient.cancelQueries({ queryKey })` for each affected key.
  2. `queryClient.getQueryData(...)` snapshot.
  3. `queryClient.setQueryData(...)` patch through the pure helper.
  4. `return { previous, …, userId }` context — `userId` included so `FriendshipButton`'s `useMutationState` filter can find pending entries by row.
  5. `onError` restores snapshot(s); 409 additionally triggers `refetchQueries` on the three list keys and shows a distinct toast.
  6. **No `onSettled` refetch.**

---

## Task 1: Add `isConflictError` helper

**Files:**
- Create: `src/lib/is-conflict-error.ts`

- [ ] **Step 1: Write `src/lib/is-conflict-error.ts`**

```ts
import { ApiError } from '@/lib/api-error'

export function isConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/is-conflict-error.ts
git commit -m "$(cat <<'EOF'
feat(lib): isConflictError type guard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extract `useInfiniteScrollSentinel` and refactor `FeedList`

The same `IntersectionObserver` `useEffect` will appear in five places after Phase D (`FeedList`, `FriendsPage`, two `FriendRequests` sections, `UserPostsList`). Extract once now so the four new lists consume a single hook.

**Files:**
- Create: `src/lib/use-infinite-scroll-sentinel.ts`
- Modify: `src/components/feed/FeedList.tsx` (lines 1-32, 94)

- [ ] **Step 1: Write `src/lib/use-infinite-scroll-sentinel.ts`**

```ts
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

type QueryLike = {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetching: boolean
  fetchNextPage: () => unknown
}

export function useInfiniteScrollSentinel(
  query: QueryLike,
): RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (
        entry.isIntersecting &&
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

  return sentinelRef
}
```

- [ ] **Step 2: Refactor `src/components/feed/FeedList.tsx` to use the hook**

Replace lines 1-9 imports and 11-32 `useEffect`. New top of file:

```tsx
import { Button } from '@/components/ui/button'
import { useFeed } from '@/features/feed/use-feed'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'
import { FeedSkeletonCard } from './FeedSkeletonCard'
import { PostCard } from './PostCard'

export function FeedList() {
  const query = useFeed()
  const sentinelRef = useInfiniteScrollSentinel(query)
  // …
```

Remove the `useEffect` + `useRef` block. Sentinel JSX (`<div ref={sentinelRef} aria-hidden="true" className="h-px" />`) stays unchanged. Everything else in the file is unchanged.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors`, `0 warnings`.

- [ ] **Step 4: Manual smoke**

Run: `pnpm dev`, open `/`, confirm feed still scrolls and loads more pages. Close.

- [ ] **Step 5: Commit**

```bash
git add src/lib/use-infinite-scroll-sentinel.ts src/components/feed/FeedList.tsx
git commit -m "$(cat <<'EOF'
refactor(feed): extract useInfiniteScrollSentinel for reuse in Phase D

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Generalize `feed-cache.ts` for cross-cache patches

`PostCard` is reused on `/users/$userId` (new in Phase D), which introduces a second cache for the same posts. `useTogglePostLike` and `useCreateComment` currently only patch `feedQueryKey`, so optimistic UI on the profile page silently breaks. Generalize the cache helpers and add fan-out utilities now; the mutations consume them in Task 4.

**Files:**
- Modify: `src/features/feed/feed-cache.ts` (full rewrite — additive)

- [ ] **Step 1: Rewrite `src/features/feed/feed-cache.ts`**

```ts
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

export type PostPages<R extends PostListResponse = PostListResponse> =
  InfiniteData<R, string | undefined>

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

export function patchPostInPages<R extends PostListResponse>(
  pages: PostPages<R> | undefined,
  postId: string,
  patch: (p: Post) => Post,
): PostPages<R> | undefined {
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

export function bumpPostCommentCount<R extends PostListResponse>(
  pages: PostPages<R> | undefined,
  postId: string,
  delta: number,
): PostPages<R> | undefined {
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`. (Existing `patchPostInFeed` callers in `use-toggle-post-like.ts` / `use-create-comment.ts` keep compiling — the alias preserves the signature.)

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/feed-cache.ts
git commit -m "$(cat <<'EOF'
refactor(feed): generalize cache helpers + add post-list fanout for Phase D

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Fan out `useTogglePostLike` and `useCreateComment` to all post-list caches

The likes and comment-counter optimistic updates now fan out across `['feed', 'infinite']` and every `['user-posts', userId, 'infinite']` cache that contains the post. Caches that don't contain the post are short-circuited inside `patchPostInPages` — zero extra work.

**Files:**
- Modify: `src/features/feed/use-toggle-post-like.ts`
- Modify: `src/features/feed/use-create-comment.ts`

- [ ] **Step 1: Rewrite `src/features/feed/use-toggle-post-like.ts`**

```ts
import { useLikePost } from '@/gen/api/hooks/useLikePost.ts'
import { useUnlikePost } from '@/gen/api/hooks/useUnlikePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { Post } from '@/gen/api/types/Post.ts'
import type { PostListSnapshot } from './feed-cache'
import {
  patchAllPostListCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type LikeContext = { snapshot: PostListSnapshot }

function applyToggle(post: Post): Post {
  return {
    ...post,
    viewerState: { ...post.viewerState, liked: !post.viewerState.liked },
    counters: {
      ...post.counters,
      likes: post.counters.likes + (post.viewerState.liked ? -1 : 1),
    },
  }
}

export function useTogglePostLike() {
  const like = useLikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const snapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, post_id, applyToggle)
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
        toast.error("Couldn't update like")
      },
    },
  })

  const unlike = useUnlikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const snapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, post_id, applyToggle)
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
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
    if (like.isPending && like.variables.post_id === postId) return true
    if (unlike.isPending && unlike.variables.post_id === postId) return true
    return false
  }

  return { toggle, isPending }
}
```

- [ ] **Step 2: Rewrite `src/features/feed/use-create-comment.ts`**

Replace the `previousFeed` snapshot/restore with the fan-out version. Full file:

```ts
import type { InfiniteData } from '@tanstack/react-query'
import { useCreateComment } from '@/gen/api/hooks/useCreateComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { ListCommentsQueryResponse } from '@/gen/api/types/ListComments.ts'
import { commentsQueryKey } from './use-post-comments'
import type { PostListSnapshot } from './feed-cache'
import {
  bumpPostCommentCount,
  patchAllPostListCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type CommentsPages = InfiniteData<
  ListCommentsQueryResponse,
  string | undefined
>

type CommentContext = {
  tempId: string
  previousComments: CommentsPages | undefined
  postListSnapshot: PostListSnapshot
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
        await queryClient.cancelQueries({
          queryKey: commentsQueryKey(postId),
        })
        const tempId = crypto.randomUUID()
        const tempComment = buildOptimisticComment(postId, data.content, tempId)
        const previousComments = queryClient.getQueryData<CommentsPages>(
          commentsQueryKey(postId),
        )
        const postListSnapshot = snapshotPostListCaches(queryClient)
        if (tempComment) {
          queryClient.setQueryData<CommentsPages>(
            commentsQueryKey(postId),
            (pages) => prependCommentToPages(pages, tempComment),
          )
          patchAllPostListCaches(queryClient, postId, (p) => ({
            ...p,
            counters: { ...p.counters, comments: p.counters.comments + 1 },
          }))
        }
        return { tempId, previousComments, postListSnapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<CommentsPages>(
            commentsQueryKey(postId),
            context.previousComments,
          )
          restorePostListCaches(queryClient, context.postListSnapshot)
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
```

Note: `bumpPostCommentCount` stays exported in `feed-cache.ts` but is unused after this change — keep it for now; it's documented API. (Future cleanup task only if a reviewer flags it.)

- [ ] **Step 3: Typecheck + lint + smoke**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors`, `0 warnings`.
Run: `pnpm dev` → cold-load `/`, like a post, post a comment. Confirm working.

- [ ] **Step 4: Commit**

```bash
git add src/features/feed/use-toggle-post-like.ts src/features/feed/use-create-comment.ts
git commit -m "$(cat <<'EOF'
refactor(feed): fan out like/comment optimistic patches across post-list caches

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `friends-cache.ts` — pure cache helpers

**Files:**
- Create: `src/features/friends/friends-cache.ts`

- [ ] **Step 1: Write `src/features/friends/friends-cache.ts`**

```ts
import type { InfiniteData } from '@tanstack/react-query'
import type { Friend } from '@/gen/api/types/Friend.ts'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'
import type { ListFriendsQueryResponse } from '@/gen/api/types/ListFriends.ts'
import type { ListIncomingFriendRequestsQueryResponse } from '@/gen/api/types/ListIncomingFriendRequests.ts'

export type FriendsPages = InfiniteData<
  ListFriendsQueryResponse,
  string | undefined
>
export type RequestsPages = InfiniteData<
  ListIncomingFriendRequestsQueryResponse,
  string | undefined
>

const EMPTY_PAGINATION: ListFriendsQueryResponse['pagination'] = {
  nextCursor: null,
  hasNext: false,
  limit: 20,
}

export function prependFriend(
  pages: FriendsPages | undefined,
  friend: Friend,
): FriendsPages {
  if (!pages || pages.pages.length === 0) {
    return {
      pages: [{ data: [friend], pagination: EMPTY_PAGINATION }],
      pageParams: [undefined],
    }
  }
  const [first, ...rest] = pages.pages
  const updatedFirst: ListFriendsQueryResponse = {
    ...first,
    data: [friend, ...first.data],
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

export function removeFriendByUserId(
  pages: FriendsPages | undefined,
  userId: string,
): FriendsPages | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((f) => f.user.id === userId),
  )
  if (!exists) return pages
  return {
    ...pages,
    pages: pages.pages.map((page) =>
      page.data.some((f) => f.user.id === userId)
        ? { ...page, data: page.data.filter((f) => f.user.id !== userId) }
        : page,
    ),
  }
}

export function prependRequest(
  pages: RequestsPages | undefined,
  request: FriendRequest,
): RequestsPages {
  if (!pages || pages.pages.length === 0) {
    return {
      pages: [{ data: [request], pagination: EMPTY_PAGINATION }],
      pageParams: [undefined],
    }
  }
  const [first, ...rest] = pages.pages
  const updatedFirst: ListIncomingFriendRequestsQueryResponse = {
    ...first,
    data: [request, ...first.data],
  }
  return { ...pages, pages: [updatedFirst, ...rest] }
}

export function removeRequestByUserId(
  pages: RequestsPages | undefined,
  userId: string,
): RequestsPages | undefined {
  if (!pages) return undefined
  const exists = pages.pages.some((page) =>
    page.data.some((r) => r.user.id === userId),
  )
  if (!exists) return pages
  return {
    ...pages,
    pages: pages.pages.map((page) =>
      page.data.some((r) => r.user.id === userId)
        ? { ...page, data: page.data.filter((r) => r.user.id !== userId) }
        : page,
    ),
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: `0 errors`.

- [ ] **Step 3: Commit**

```bash
git add src/features/friends/friends-cache.ts
git commit -m "$(cat <<'EOF'
feat(friends): pure cache helpers for friend / request lists

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: `useFriends` hook

**Files:**
- Create: `src/features/friends/use-friends.ts`

- [ ] **Step 1: Write `src/features/friends/use-friends.ts`**

```ts
import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listFriends } from '@/gen/api/clients/listFriends.ts'
import type { ListFriendsQueryResponse } from '@/gen/api/types/ListFriends.ts'
import type { Friend } from '@/gen/api/types/Friend.ts'

export const friendsQueryKey = ['friends', 'infinite'] as const

export function useFriends() {
  const query = useInfiniteQuery<
    ListFriendsQueryResponse,
    Error,
    InfiniteData<ListFriendsQueryResponse, string | undefined>,
    typeof friendsQueryKey,
    string | undefined
  >({
    queryKey: friendsQueryKey,
    queryFn: ({ pageParam }) =>
      listFriends({ params: { limit: 20, cursor: pageParam } }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const friends = useMemo<Friend[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, friends }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `pnpm typecheck`. Then:

```bash
git add src/features/friends/use-friends.ts
git commit -m "$(cat <<'EOF'
feat(friends): useFriends infinite query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: `useIncomingRequests` hook

**Files:**
- Create: `src/features/friends/use-incoming-requests.ts`

- [ ] **Step 1: Write `src/features/friends/use-incoming-requests.ts`**

```ts
import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listIncomingFriendRequests } from '@/gen/api/clients/listIncomingFriendRequests.ts'
import type { ListIncomingFriendRequestsQueryResponse } from '@/gen/api/types/ListIncomingFriendRequests.ts'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'

export const incomingRequestsQueryKey = [
  'friend-requests',
  'incoming',
  'infinite',
] as const

export function useIncomingRequests() {
  const query = useInfiniteQuery<
    ListIncomingFriendRequestsQueryResponse,
    Error,
    InfiniteData<ListIncomingFriendRequestsQueryResponse, string | undefined>,
    typeof incomingRequestsQueryKey,
    string | undefined
  >({
    queryKey: incomingRequestsQueryKey,
    queryFn: ({ pageParam }) =>
      listIncomingFriendRequests({
        params: { limit: 20, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const incomingRequests = useMemo<FriendRequest[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, incomingRequests }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-incoming-requests.ts
git commit -m "$(cat <<'EOF'
feat(friends): useIncomingRequests infinite query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: `useOutgoingRequests` hook

**Files:**
- Create: `src/features/friends/use-outgoing-requests.ts`

- [ ] **Step 1: Write `src/features/friends/use-outgoing-requests.ts`**

```ts
import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listOutgoingFriendRequests } from '@/gen/api/clients/listOutgoingFriendRequests.ts'
import type { ListOutgoingFriendRequestsQueryResponse } from '@/gen/api/types/ListOutgoingFriendRequests.ts'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'

export const outgoingRequestsQueryKey = [
  'friend-requests',
  'outgoing',
  'infinite',
] as const

export function useOutgoingRequests() {
  const query = useInfiniteQuery<
    ListOutgoingFriendRequestsQueryResponse,
    Error,
    InfiniteData<ListOutgoingFriendRequestsQueryResponse, string | undefined>,
    typeof outgoingRequestsQueryKey,
    string | undefined
  >({
    queryKey: outgoingRequestsQueryKey,
    queryFn: ({ pageParam }) =>
      listOutgoingFriendRequests({
        params: { limit: 20, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
  })

  const outgoingRequests = useMemo<FriendRequest[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, outgoingRequests }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-outgoing-requests.ts
git commit -m "$(cat <<'EOF'
feat(friends): useOutgoingRequests infinite query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `useSuggestedUsers` hook

**Files:**
- Create: `src/features/friends/use-suggested-users.ts`

- [ ] **Step 1: Write `src/features/friends/use-suggested-users.ts`**

```ts
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listUsers } from '@/gen/api/clients/listUsers.ts'
import type { User } from '@/gen/api/types/User.ts'

export const suggestedUsersQueryKey = ['users', 'suggested'] as const

export function useSuggestedUsers() {
  const query = useQuery({
    queryKey: suggestedUsersQueryKey,
    queryFn: () => listUsers({ params: { page: 1, limit: 4 } }),
  })

  const users = useMemo<User[]>(() => query.data?.data ?? [], [query.data])

  return { ...query, users }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-suggested-users.ts
git commit -m "$(cat <<'EOF'
feat(friends): useSuggestedUsers (page 1, limit 4)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `useUser` hook

**Files:**
- Create: `src/features/friends/use-user.ts`

- [ ] **Step 1: Write `src/features/friends/use-user.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { getUser } from '@/gen/api/clients/getUser.ts'

export const userQueryKey = (userId: string) => ['user', userId] as const

export function useUser(userId: string) {
  return useQuery({
    queryKey: userQueryKey(userId),
    queryFn: () => getUser({ id: userId }),
    enabled: userId.length > 0,
  })
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-user.ts
git commit -m "$(cat <<'EOF'
feat(friends): useUser query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `useUserPosts` hook

**Files:**
- Create: `src/features/friends/use-user-posts.ts`

- [ ] **Step 1: Write `src/features/friends/use-user-posts.ts`**

```ts
import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import { listPostsByUser } from '@/gen/api/clients/listPostsByUser.ts'
import type { ListPostsByUserQueryResponse } from '@/gen/api/types/ListPostsByUser.ts'
import type { Post } from '@/gen/api/types/Post.ts'

export const userPostsQueryKey = (userId: string) =>
  ['user-posts', userId, 'infinite'] as const

export function useUserPosts(userId: string) {
  const queryKey = userPostsQueryKey(userId)
  const query = useInfiniteQuery<
    ListPostsByUserQueryResponse,
    Error,
    InfiniteData<ListPostsByUserQueryResponse, string | undefined>,
    ReturnType<typeof userPostsQueryKey>,
    string | undefined
  >({
    queryKey,
    queryFn: ({ pageParam }) =>
      listPostsByUser({
        id: userId,
        params: { limit: 20, cursor: pageParam },
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    enabled: userId.length > 0,
  })

  const posts = useMemo<Post[]>(
    () => query.data?.pages.flatMap((p) => p.data) ?? [],
    [query.data],
  )

  return { ...query, posts }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-user-posts.ts
git commit -m "$(cat <<'EOF'
feat(friends): useUserPosts infinite query

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: `useFriendshipStatus` hook

Composes the three list hooks + auth store to return a discriminated state. Drift past page 1 is accepted (documented in spec §Open Items).

**Files:**
- Create: `src/features/friends/use-friendship-status.ts`

- [ ] **Step 1: Write `src/features/friends/use-friendship-status.ts`**

```ts
import { useAuthStore } from '@/hooks/use-auth'
import { useFriends } from './use-friends'
import { useIncomingRequests } from './use-incoming-requests'
import { useOutgoingRequests } from './use-outgoing-requests'

export type FriendshipState =
  | 'self'
  | 'none'
  | 'outgoing'
  | 'incoming'
  | 'friend'

export type FriendshipStatusResult = {
  state: FriendshipState
  isLoading: boolean
}

export function useFriendshipStatus(userId: string): FriendshipStatusResult {
  const meId = useAuthStore((s) => s.user?.id)
  const friends = useFriends()
  const incoming = useIncomingRequests()
  const outgoing = useOutgoingRequests()

  const isLoading =
    friends.isLoading || incoming.isLoading || outgoing.isLoading

  if (meId && userId === meId) return { state: 'self', isLoading: false }

  const isFriend =
    friends.data?.pages.some((page) =>
      page.data.some((f) => f.user.id === userId),
    ) ?? false
  if (isFriend) return { state: 'friend', isLoading }

  const isOutgoing =
    outgoing.data?.pages.some((page) =>
      page.data.some((r) => r.user.id === userId),
    ) ?? false
  if (isOutgoing) return { state: 'outgoing', isLoading }

  const isIncoming =
    incoming.data?.pages.some((page) =>
      page.data.some((r) => r.user.id === userId),
    ) ?? false
  if (isIncoming) return { state: 'incoming', isLoading }

  return { state: 'none', isLoading }
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-friendship-status.ts
git commit -m "$(cat <<'EOF'
feat(friends): useFriendshipStatus derives 5-state from list caches

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: `useSendFriendRequest` mutation

**Files:**
- Create: `src/features/friends/use-send-friend-request.ts`

- [ ] **Step 1: Write `src/features/friends/use-send-friend-request.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { sendFriendRequest } from '@/gen/api/clients/sendFriendRequest.ts'
import { sendFriendRequestMutationKey } from '@/gen/api/hooks/useSendFriendRequest.ts'
import type { SendFriendRequestMutationResponse } from '@/gen/api/types/SendFriendRequest.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { isConflictError } from '@/lib/is-conflict-error'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'
import type { ApiError } from '@/lib/api-error'
import type { RequestsPages } from './friends-cache'
import { prependRequest } from './friends-cache'
import { friendsQueryKey } from './use-friends'
import { incomingRequestsQueryKey } from './use-incoming-requests'
import { outgoingRequestsQueryKey } from './use-outgoing-requests'

type Variables = { user: UserSummary }

type Context = {
  previous: RequestsPages | undefined
  userId: string
}

export function useSendFriendRequest() {
  return useMutation<
    SendFriendRequestMutationResponse,
    ApiError,
    Variables,
    Context
  >({
    mutationKey: sendFriendRequestMutationKey(),
    mutationFn: ({ user }) =>
      sendFriendRequest({ data: { userId: user.id } }),
    onMutate: async ({ user }) => {
      await queryClient.cancelQueries({
        queryKey: outgoingRequestsQueryKey,
      })
      const previous = queryClient.getQueryData<RequestsPages>(
        outgoingRequestsQueryKey,
      )
      const me = useAuthStore.getState().user
      if (me) {
        const optimistic: FriendRequest = {
          user,
          requesterId: me.id,
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
          (pages) => prependRequest(pages, optimistic),
        )
      }
      return { previous, userId: user.id }
    },
    onError: (err, _vars, context) => {
      if (context) {
        queryClient.setQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
          context.previous,
        )
      }
      if (isConflictError(err)) {
        toast.error('This relationship has already changed')
        void queryClient.refetchQueries({ queryKey: friendsQueryKey })
        void queryClient.refetchQueries({
          queryKey: incomingRequestsQueryKey,
        })
        void queryClient.refetchQueries({
          queryKey: outgoingRequestsQueryKey,
        })
      } else {
        toast.error("Couldn't send friend request")
      }
    },
  })
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-send-friend-request.ts
git commit -m "$(cat <<'EOF'
feat(friends): useSendFriendRequest optimistic mutation + 409 reconcile

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: `useAcceptFriendRequest` mutation

**Files:**
- Create: `src/features/friends/use-accept-friend-request.ts`

- [ ] **Step 1: Write `src/features/friends/use-accept-friend-request.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { acceptFriendRequest } from '@/gen/api/clients/acceptFriendRequest.ts'
import { acceptFriendRequestMutationKey } from '@/gen/api/hooks/useAcceptFriendRequest.ts'
import type { AcceptFriendRequestMutationResponse } from '@/gen/api/types/AcceptFriendRequest.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { isConflictError } from '@/lib/is-conflict-error'
import type { ApiError } from '@/lib/api-error'
import type { Friend } from '@/gen/api/types/Friend.ts'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'
import type { FriendsPages, RequestsPages } from './friends-cache'
import { prependFriend, removeRequestByUserId } from './friends-cache'
import { friendsQueryKey } from './use-friends'
import { incomingRequestsQueryKey } from './use-incoming-requests'
import { outgoingRequestsQueryKey } from './use-outgoing-requests'

type Variables = { user: UserSummary }

type Context = {
  previousFriends: FriendsPages | undefined
  previousIncoming: RequestsPages | undefined
  userId: string
}

export function useAcceptFriendRequest() {
  return useMutation<
    AcceptFriendRequestMutationResponse,
    ApiError,
    Variables,
    Context
  >({
    mutationKey: acceptFriendRequestMutationKey(),
    mutationFn: ({ user }) => acceptFriendRequest({ user_id: user.id }),
    onMutate: async ({ user }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: friendsQueryKey }),
        queryClient.cancelQueries({ queryKey: incomingRequestsQueryKey }),
      ])
      const previousFriends =
        queryClient.getQueryData<FriendsPages>(friendsQueryKey)
      const previousIncoming = queryClient.getQueryData<RequestsPages>(
        incomingRequestsQueryKey,
      )
      const optimisticFriend: Friend = {
        user,
        acceptedAt: new Date().toISOString(),
      }
      queryClient.setQueryData<RequestsPages>(
        incomingRequestsQueryKey,
        (pages) => removeRequestByUserId(pages, user.id),
      )
      queryClient.setQueryData<FriendsPages>(friendsQueryKey, (pages) =>
        prependFriend(pages, optimisticFriend),
      )
      return { previousFriends, previousIncoming, userId: user.id }
    },
    onError: (err, _vars, context) => {
      if (context) {
        queryClient.setQueryData<FriendsPages>(
          friendsQueryKey,
          context.previousFriends,
        )
        queryClient.setQueryData<RequestsPages>(
          incomingRequestsQueryKey,
          context.previousIncoming,
        )
      }
      if (isConflictError(err)) {
        toast.error('This relationship has already changed')
        void queryClient.refetchQueries({ queryKey: friendsQueryKey })
        void queryClient.refetchQueries({
          queryKey: incomingRequestsQueryKey,
        })
        void queryClient.refetchQueries({
          queryKey: outgoingRequestsQueryKey,
        })
      } else {
        toast.error("Couldn't accept friend request")
      }
    },
  })
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-accept-friend-request.ts
git commit -m "$(cat <<'EOF'
feat(friends): useAcceptFriendRequest optimistic mutation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: `useDeleteFriendRelationship` mutation

Single API endpoint covers three UX actions. Mode is part of the mutation variables; `onMutate` branches.

**Files:**
- Create: `src/features/friends/use-delete-friend-relationship.ts`

- [ ] **Step 1: Write `src/features/friends/use-delete-friend-relationship.ts`**

```ts
import { useMutation } from '@tanstack/react-query'
import { deleteFriendRelationship } from '@/gen/api/clients/deleteFriendRelationship.ts'
import { deleteFriendRelationshipMutationKey } from '@/gen/api/hooks/useDeleteFriendRelationship.ts'
import type { DeleteFriendRelationshipMutationResponse } from '@/gen/api/types/DeleteFriendRelationship.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { isConflictError } from '@/lib/is-conflict-error'
import type { ApiError } from '@/lib/api-error'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'
import type { FriendsPages, RequestsPages } from './friends-cache'
import {
  removeFriendByUserId,
  removeRequestByUserId,
} from './friends-cache'
import { friendsQueryKey } from './use-friends'
import { incomingRequestsQueryKey } from './use-incoming-requests'
import { outgoingRequestsQueryKey } from './use-outgoing-requests'

export type DeleteMode = 'unfriend' | 'cancel' | 'decline'

type Variables = { user: UserSummary; mode: DeleteMode }

type Context = {
  mode: DeleteMode
  previousFriends?: FriendsPages | undefined
  previousOutgoing?: RequestsPages | undefined
  previousIncoming?: RequestsPages | undefined
  userId: string
}

const ERROR_BY_MODE: Record<DeleteMode, string> = {
  unfriend: "Couldn't unfriend",
  cancel: "Couldn't cancel request",
  decline: "Couldn't decline request",
}

export function useDeleteFriendRelationship() {
  return useMutation<
    DeleteFriendRelationshipMutationResponse,
    ApiError,
    Variables,
    Context
  >({
    mutationKey: deleteFriendRelationshipMutationKey(),
    mutationFn: ({ user }) =>
      deleteFriendRelationship({ user_id: user.id }),
    onMutate: async ({ user, mode }) => {
      if (mode === 'unfriend') {
        await queryClient.cancelQueries({ queryKey: friendsQueryKey })
        const previousFriends =
          queryClient.getQueryData<FriendsPages>(friendsQueryKey)
        queryClient.setQueryData<FriendsPages>(friendsQueryKey, (pages) =>
          removeFriendByUserId(pages, user.id),
        )
        return { mode, previousFriends, userId: user.id }
      }
      if (mode === 'cancel') {
        await queryClient.cancelQueries({
          queryKey: outgoingRequestsQueryKey,
        })
        const previousOutgoing = queryClient.getQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
        )
        queryClient.setQueryData<RequestsPages>(
          outgoingRequestsQueryKey,
          (pages) => removeRequestByUserId(pages, user.id),
        )
        return { mode, previousOutgoing, userId: user.id }
      }
      // decline
      await queryClient.cancelQueries({
        queryKey: incomingRequestsQueryKey,
      })
      const previousIncoming = queryClient.getQueryData<RequestsPages>(
        incomingRequestsQueryKey,
      )
      queryClient.setQueryData<RequestsPages>(
        incomingRequestsQueryKey,
        (pages) => removeRequestByUserId(pages, user.id),
      )
      return { mode, previousIncoming, userId: user.id }
    },
    onError: (err, _vars, context) => {
      if (context) {
        if (context.mode === 'unfriend' && context.previousFriends) {
          queryClient.setQueryData<FriendsPages>(
            friendsQueryKey,
            context.previousFriends,
          )
        }
        if (context.mode === 'cancel' && context.previousOutgoing) {
          queryClient.setQueryData<RequestsPages>(
            outgoingRequestsQueryKey,
            context.previousOutgoing,
          )
        }
        if (context.mode === 'decline' && context.previousIncoming) {
          queryClient.setQueryData<RequestsPages>(
            incomingRequestsQueryKey,
            context.previousIncoming,
          )
        }
      }
      if (isConflictError(err)) {
        toast.error('This relationship has already changed')
        void queryClient.refetchQueries({ queryKey: friendsQueryKey })
        void queryClient.refetchQueries({
          queryKey: incomingRequestsQueryKey,
        })
        void queryClient.refetchQueries({
          queryKey: outgoingRequestsQueryKey,
        })
      } else {
        const mode = context?.mode ?? 'unfriend'
        toast.error(ERROR_BY_MODE[mode])
      }
    },
  })
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/features/friends/use-delete-friend-relationship.ts
git commit -m "$(cat <<'EOF'
feat(friends): useDeleteFriendRelationship mode-branched optimistic mutation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: `PersonRow` + `FriendsSkeletonRow` primitives

**Files:**
- Create: `src/components/friends/PersonRow.tsx`
- Create: `src/components/friends/FriendsSkeletonRow.tsx`

- [ ] **Step 1: Write `src/components/friends/PersonRow.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'

type Props = {
  user: UserSummary
  /** When provided, the avatar + name area becomes a router Link to /users/$userId. */
  profileLinkUserId?: string
  avatarSize?: 'sm' | 'md' | 'lg'
  action?: ReactNode
  className?: string
}

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

const AVATAR_CLASS: Record<NonNullable<Props['avatarSize']>, string> = {
  sm: 'size-8',
  md: 'size-10',
  lg: 'size-12',
}

export function PersonRow({
  user,
  profileLinkUserId,
  avatarSize = 'md',
  action,
  className,
}: Props) {
  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const initials = userInitials(user.firstName, user.lastName)
  const inner = (
    <>
      <Avatar className={AVATAR_CLASS[avatarSize]}>
        {user.avatarUrl ? (
          <AvatarImage src={user.avatarUrl} alt={fullName} />
        ) : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {fullName}
      </span>
    </>
  )
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {profileLinkUserId ? (
        <Link
          to="/users/$userId"
          params={{ userId: profileLinkUserId }}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-md hover:opacity-80"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{inner}</div>
      )}
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/friends/FriendsSkeletonRow.tsx`**

```tsx
export function FriendsSkeletonRow() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading person"
      className="flex items-center gap-3"
    >
      <div className="size-10 animate-pulse rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/friends/PersonRow.tsx src/components/friends/FriendsSkeletonRow.tsx
git commit -m "$(cat <<'EOF'
feat(friends): PersonRow + FriendsSkeletonRow primitives

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: `FriendshipButton`

State-machine button. Reads cached state from `useFriendshipStatus`; fires the matching mutation; uses `useMutationState` to detect pending requests for THIS user (so the row dims while a mutation is in-flight, even from a separate render tree such as the sidebar).

**Files:**
- Create: `src/components/friends/FriendshipButton.tsx`

- [ ] **Step 1: Write `src/components/friends/FriendshipButton.tsx`**

```tsx
import { useMutationState } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sendFriendRequestMutationKey } from '@/gen/api/hooks/useSendFriendRequest.ts'
import { acceptFriendRequestMutationKey } from '@/gen/api/hooks/useAcceptFriendRequest.ts'
import { deleteFriendRelationshipMutationKey } from '@/gen/api/hooks/useDeleteFriendRelationship.ts'
import { useFriendshipStatus } from '@/features/friends/use-friendship-status'
import { useSendFriendRequest } from '@/features/friends/use-send-friend-request'
import { useAcceptFriendRequest } from '@/features/friends/use-accept-friend-request'
import { useDeleteFriendRelationship } from '@/features/friends/use-delete-friend-relationship'
import { cn } from '@/lib/utils'
import type { User } from '@/gen/api/types/User.ts'
import type { UserSummary } from '@/gen/api/types/UserSummary.ts'

type Variant = 'primary' | 'inline' | 'ghost'

type Props = {
  user: User | UserSummary
  variant?: Variant
}

function pickUserId(context: unknown): string | undefined {
  if (typeof context !== 'object' || context === null) return undefined
  if (!('userId' in context)) return undefined
  const val = (context as { userId: unknown }).userId
  return typeof val === 'string' ? val : undefined
}

function usePendingForUser(userId: string): boolean {
  const sendPending = useMutationState({
    filters: {
      mutationKey: sendFriendRequestMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  const acceptPending = useMutationState({
    filters: {
      mutationKey: acceptFriendRequestMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  const deletePending = useMutationState({
    filters: {
      mutationKey: deleteFriendRelationshipMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  return (
    sendPending.includes(userId) ||
    acceptPending.includes(userId) ||
    deletePending.includes(userId)
  )
}

function toUserSummary(user: User | UserSummary): UserSummary {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

export function FriendshipButton({ user, variant = 'primary' }: Props) {
  const { state, isLoading } = useFriendshipStatus(user.id)
  const send = useSendFriendRequest()
  const accept = useAcceptFriendRequest()
  const remove = useDeleteFriendRelationship()
  const isPending = usePendingForUser(user.id)
  const summary = toUserSummary(user)

  if (state === 'self') return null

  if (isLoading) {
    return (
      <Button
        size={variant === 'inline' ? 'sm' : 'default'}
        variant="outline"
        disabled
        className={variant === 'inline' ? 'h-8 px-3 text-xs' : undefined}
      >
        …
      </Button>
    )
  }

  const sizeProp = variant === 'inline' ? 'sm' : 'default'
  const baseCls = variant === 'inline' ? 'h-8 px-3 text-xs' : undefined

  if (state === 'incoming') {
    return (
      <div className="flex items-center gap-2">
        <Button
          size={sizeProp}
          variant="default"
          disabled={isPending}
          onClick={() => accept.mutate({ user: summary })}
          className={baseCls}
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Accept'}
        </Button>
        <Button
          size={sizeProp}
          variant="outline"
          disabled={isPending}
          onClick={() =>
            remove.mutate({ user: summary, mode: 'decline' })
          }
          className={baseCls}
        >
          Decline
        </Button>
      </div>
    )
  }

  if (state === 'outgoing') {
    return (
      <Button
        size={sizeProp}
        variant="outline"
        disabled={isPending}
        onClick={() => remove.mutate({ user: summary, mode: 'cancel' })}
        className={cn(baseCls)}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Pending'}
      </Button>
    )
  }

  if (state === 'friend') {
    return (
      <Button
        size={sizeProp}
        variant={variant === 'ghost' ? 'ghost' : 'outline'}
        disabled={isPending}
        onClick={() => remove.mutate({ user: summary, mode: 'unfriend' })}
        className={baseCls}
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Friends'}
      </Button>
    )
  }

  // 'none'
  return (
    <Button
      size={sizeProp}
      variant={variant === 'inline' ? 'outline' : 'default'}
      disabled={isPending}
      onClick={() => send.mutate({ user: summary })}
      className={baseCls}
    >
      {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Connect'}
    </Button>
  )
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/friends/FriendshipButton.tsx
git commit -m "$(cat <<'EOF'
feat(friends): FriendshipButton 5-state machine

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 18: `FriendRequestRow`

**Files:**
- Create: `src/components/friends/FriendRequestRow.tsx`

- [ ] **Step 1: Write `src/components/friends/FriendRequestRow.tsx`**

```tsx
import { useMutationState } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { acceptFriendRequestMutationKey } from '@/gen/api/hooks/useAcceptFriendRequest.ts'
import { deleteFriendRelationshipMutationKey } from '@/gen/api/hooks/useDeleteFriendRelationship.ts'
import { useAcceptFriendRequest } from '@/features/friends/use-accept-friend-request'
import { useDeleteFriendRelationship } from '@/features/friends/use-delete-friend-relationship'
import type { FriendRequest } from '@/gen/api/types/FriendRequest.ts'
import { PersonRow } from './PersonRow'

type Kind = 'incoming' | 'outgoing'

type Props = {
  request: FriendRequest
  kind: Kind
}

function pickUserId(context: unknown): string | undefined {
  if (typeof context !== 'object' || context === null) return undefined
  if (!('userId' in context)) return undefined
  const val = (context as { userId: unknown }).userId
  return typeof val === 'string' ? val : undefined
}

function usePendingForUser(userId: string): boolean {
  const acceptPending = useMutationState({
    filters: {
      mutationKey: acceptFriendRequestMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  const deletePending = useMutationState({
    filters: {
      mutationKey: deleteFriendRelationshipMutationKey(),
      status: 'pending',
    },
    select: (m) => pickUserId(m.state.context),
  })
  return acceptPending.includes(userId) || deletePending.includes(userId)
}

export function FriendRequestRow({ request, kind }: Props) {
  const accept = useAcceptFriendRequest()
  const remove = useDeleteFriendRelationship()
  const isPending = usePendingForUser(request.user.id)

  const action =
    kind === 'incoming' ? (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="default"
          disabled={isPending}
          onClick={() => accept.mutate({ user: request.user })}
          className="h-8 px-3 text-xs"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Accept'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            remove.mutate({ user: request.user, mode: 'decline' })
          }
          className="h-8 px-3 text-xs"
        >
          Decline
        </Button>
      </div>
    ) : (
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          remove.mutate({ user: request.user, mode: 'cancel' })
        }
        className="h-8 px-3 text-xs"
      >
        {isPending ? <Loader2 className="size-3 animate-spin" /> : 'Cancel'}
      </Button>
    )

  return (
    <PersonRow
      user={request.user}
      profileLinkUserId={request.user.id}
      action={action}
    />
  )
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/friends/FriendRequestRow.tsx
git commit -m "$(cat <<'EOF'
feat(friends): FriendRequestRow with Accept/Decline or Cancel

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 19: `ProfileHeader`

**Files:**
- Create: `src/components/friends/ProfileHeader.tsx`

- [ ] **Step 1: Write `src/components/friends/ProfileHeader.tsx`**

```tsx
import { MessageCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { FriendshipButton } from './FriendshipButton'
import type { User } from '@/gen/api/types/User.ts'

type Props = {
  user: User
}

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

export function ProfileHeader({ user }: Props) {
  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const initials = userInitials(user.firstName, user.lastName)
  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Avatar className="size-20">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={fullName} />
          ) : null}
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{fullName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <FriendshipButton user={user} variant="primary" />
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={() => toast.info('Messaging coming soon')}
          >
            <MessageCircle className="mr-2 size-4" />
            Message
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/components/friends/ProfileHeader.tsx
git commit -m "$(cat <<'EOF'
feat(friends): ProfileHeader (avatar, name, FriendshipButton, Message stub)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 20: `UserPostsList`

**Files:**
- Create: `src/components/friends/UserPostsList.tsx`

- [ ] **Step 1: Write `src/components/friends/UserPostsList.tsx`**

```tsx
import { Button } from '@/components/ui/button'
import { FeedSkeletonCard } from '@/components/feed/FeedSkeletonCard'
import { PostCard } from '@/components/feed/PostCard'
import { useUserPosts } from '@/features/friends/use-user-posts'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'

type Props = {
  userId: string
  emptyCopy?: string
}

export function UserPostsList({
  userId,
  emptyCopy = "This user hasn't posted yet.",
}: Props) {
  const query = useUserPosts(userId)
  const sentinelRef = useInfiniteScrollSentinel(query)

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
          Couldn&apos;t load posts. Try again.
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
        <p className="text-sm text-muted-foreground">{emptyCopy}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {query.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      {query.isFetchingNextPage ? (
        <FeedSkeletonCard />
      ) : query.isError ? (
        <div className="rounded-lg bg-card p-4 text-center shadow-sm">
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t load more.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.fetchNextPage()}
          >
            Retry
          </Button>
        </div>
      ) : !query.hasNextPage ? (
        <p className="text-center text-xs text-muted-foreground">
          No more posts
        </p>
      ) : null}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm typecheck
git add src/components/friends/UserPostsList.tsx
git commit -m "$(cat <<'EOF'
feat(friends): UserPostsList reuses PostCard for /users/$userId

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 21: `/friends` route + `FriendsPage`

**Files:**
- Create: `src/routes/_app/friends.tsx`

- [ ] **Step 1: Write `src/routes/_app/friends.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { PersonRow } from '@/components/friends/PersonRow'
import { FriendshipButton } from '@/components/friends/FriendshipButton'
import { useFriends } from '@/features/friends/use-friends'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'

export const Route = createFileRoute('/_app/friends')({
  component: FriendsPage,
})

function FriendsPage() {
  const query = useFriends()
  const sentinelRef = useInfiniteScrollSentinel(query)

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Your friends</h1>
      </div>
      {query.isLoading ? (
        <div className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError && !query.data ? (
        <div className="rounded-lg bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load friends. Try again.
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
      ) : query.friends.length === 0 ? (
        <div className="rounded-lg bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any friends yet. Try connecting with someone
            from the suggestions in the sidebar.
          </p>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg bg-card p-6 shadow-sm">
          {query.friends.map((f) => (
            <PersonRow
              key={f.user.id}
              user={f.user}
              profileLinkUserId={f.user.id}
              action={<FriendshipButton user={f.user} variant="ghost" />}
            />
          ))}
          {query.isFetchingNextPage ? (
            <FriendsSkeletonRow />
          ) : query.isError ? (
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
              >
                Retry
              </Button>
            </div>
          ) : !query.hasNextPage ? (
            <p className="text-center text-xs text-muted-foreground">
              You&apos;ve seen all your friends
            </p>
          ) : null}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint + smoke**

Run: `pnpm typecheck && pnpm lint`. Then `pnpm dev` → navigate to `/friends` directly. The route should load (empty state until friends exist).

- [ ] **Step 3: Commit**

```bash
git add src/routes/_app/friends.tsx src/routeTree.gen.ts
git commit -m "$(cat <<'EOF'
feat(routes): /friends page with infinite list

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 22: `/friend-requests` rewrite (Incoming + Outgoing)

**Files:**
- Modify: `src/routes/_app/friend-requests.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `src/routes/_app/friend-requests.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { FriendRequestRow } from '@/components/friends/FriendRequestRow'
import { useIncomingRequests } from '@/features/friends/use-incoming-requests'
import { useOutgoingRequests } from '@/features/friends/use-outgoing-requests'
import { useInfiniteScrollSentinel } from '@/lib/use-infinite-scroll-sentinel'

export const Route = createFileRoute('/_app/friend-requests')({
  component: FriendRequestsPage,
})

function FriendRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Friend requests</h1>
      </div>
      <IncomingSection />
      <OutgoingSection />
    </div>
  )
}

function IncomingSection() {
  const query = useIncomingRequests()
  const sentinelRef = useInfiniteScrollSentinel(query)

  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        Incoming
      </h2>
      {query.isLoading ? (
        <div className="space-y-4">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError && !query.data ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load incoming requests.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : query.incomingRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No incoming requests right now.
        </p>
      ) : (
        <div className="space-y-4">
          {query.incomingRequests.map((r) => (
            <FriendRequestRow key={r.user.id} request={r} kind="incoming" />
          ))}
          {query.isFetchingNextPage ? (
            <FriendsSkeletonRow />
          ) : query.isError ? (
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
              >
                Retry
              </Button>
            </div>
          ) : !query.hasNextPage ? (
            <p className="text-center text-xs text-muted-foreground">
              No more incoming requests
            </p>
          ) : null}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </div>
      )}
    </section>
  )
}

function OutgoingSection() {
  const query = useOutgoingRequests()
  const sentinelRef = useInfiniteScrollSentinel(query)

  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
        Outgoing
      </h2>
      {query.isLoading ? (
        <div className="space-y-4">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError && !query.data ? (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Couldn&apos;t load outgoing requests.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void query.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : query.outgoingRequests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven&apos;t sent any requests.
        </p>
      ) : (
        <div className="space-y-4">
          {query.outgoingRequests.map((r) => (
            <FriendRequestRow key={r.user.id} request={r} kind="outgoing" />
          ))}
          {query.isFetchingNextPage ? (
            <FriendsSkeletonRow />
          ) : query.isError ? (
            <div className="text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
              >
                Retry
              </Button>
            </div>
          ) : !query.hasNextPage ? (
            <p className="text-center text-xs text-muted-foreground">
              No more outgoing requests
            </p>
          ) : null}
          <div ref={sentinelRef} aria-hidden="true" className="h-px" />
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/routes/_app/friend-requests.tsx
git commit -m "$(cat <<'EOF'
feat(routes): /friend-requests Incoming + Outgoing sections

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 23: `/users/$userId` route

**Files:**
- Create: `src/routes/_app/users.$userId.tsx`

- [ ] **Step 1: Write `src/routes/_app/users.$userId.tsx`**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useAuthStore } from '@/hooks/use-auth'
import { ProfileHeader } from '@/components/friends/ProfileHeader'
import { UserPostsList } from '@/components/friends/UserPostsList'
import { FeedSkeletonCard } from '@/components/feed/FeedSkeletonCard'
import { useUser } from '@/features/friends/use-user'
import { ApiError } from '@/lib/api-error'

export const Route = createFileRoute('/_app/users/$userId')({
  component: UserProfilePage,
})

function UserProfilePage() {
  const { userId } = Route.useParams()
  const meId = useAuthStore((s) => s.user?.id)
  const userQuery = useUser(userId)

  if (userQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="size-20 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
        <FeedSkeletonCard />
      </div>
    )
  }

  if (userQuery.isError) {
    const is404 =
      userQuery.error instanceof ApiError && userQuery.error.status === 404
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">
          {is404 ? 'User not found.' : "Couldn't load profile. Try again."}
        </p>
      </div>
    )
  }

  const user = userQuery.data?.data
  if (!user) {
    return (
      <div className="rounded-lg bg-card p-8 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">User not found.</p>
      </div>
    )
  }

  const isSelf = meId === user.id
  const emptyCopy = isSelf
    ? "You haven't posted yet."
    : "This user hasn't posted yet."

  return (
    <div className="space-y-6">
      <ProfileHeader user={user} />
      <UserPostsList userId={user.id} emptyCopy={emptyCopy} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck + lint + smoke**

Run: `pnpm typecheck && pnpm lint`. The router plugin should regenerate `routeTree.gen.ts` for `/_app/users/$userId`. Run `pnpm dev` → visit `/users/00000000-0000-0000-0000-000000000000` → expect "User not found" card; visit `/users/<a-real-id>` → header + posts list render.

- [ ] **Step 3: Commit**

```bash
git add src/routes/_app/users.\$userId.tsx src/routeTree.gen.ts
git commit -m "$(cat <<'EOF'
feat(routes): /users/\$userId profile with header + posts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 24: `YourFriendsCard` → live data

**Files:**
- Modify: `src/components/shell/cards/YourFriendsCard.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `src/components/shell/cards/YourFriendsCard.tsx`**

```tsx
import { useState, type FormEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { PersonRow } from '@/components/friends/PersonRow'
import { useFriends } from '@/features/friends/use-friends'

export function YourFriendsCard() {
  const [query, setQuery] = useState('')
  const friendsQuery = useFriends()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    toast.info('Search coming soon')
  }

  return (
    <section className="rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Your Friends</h2>
        <Link
          to="/friends"
          className="text-xs text-muted-foreground hover:underline"
        >
          See All
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search friends"
            className="w-full rounded-full bg-muted px-9 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      </form>
      <ScrollArea className="max-h-[420px]">
        {friendsQuery.isLoading ? (
          <div className="space-y-3">
            <FriendsSkeletonRow />
            <FriendsSkeletonRow />
            <FriendsSkeletonRow />
          </div>
        ) : friendsQuery.isError && !friendsQuery.data ? (
          <p className="text-xs text-muted-foreground">
            Couldn&apos;t load friends.
          </p>
        ) : friendsQuery.friends.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No friends yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {friendsQuery.friends.map((f) => (
              <li key={f.user.id}>
                <PersonRow
                  user={f.user}
                  avatarSize="sm"
                  profileLinkUserId={f.user.id}
                />
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </section>
  )
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/shell/cards/YourFriendsCard.tsx
git commit -m "$(cat <<'EOF'
feat(shell): YourFriendsCard uses live useFriends data

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 25: `SuggestedPeopleCard` → live data

**Files:**
- Modify: `src/components/shell/cards/SuggestedPeopleCard.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `src/components/shell/cards/SuggestedPeopleCard.tsx`**

```tsx
import { toast } from '@/components/ui/sonner'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { FriendshipButton } from '@/components/friends/FriendshipButton'
import { PersonRow } from '@/components/friends/PersonRow'
import { useSuggestedUsers } from '@/features/friends/use-suggested-users'

export function SuggestedPeopleCard() {
  const query = useSuggestedUsers()
  const users = query.users.slice(0, 3)

  return (
    <section className="rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Suggested People</h2>
        <button
          type="button"
          onClick={() => toast.info('Browse all coming soon')}
          className="text-xs text-muted-foreground hover:underline"
        >
          See All
        </button>
      </div>
      {query.isLoading ? (
        <div className="space-y-3">
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
          <FriendsSkeletonRow />
        </div>
      ) : query.isError ? (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load suggestions.
        </p>
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : (
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id}>
              <PersonRow
                user={u}
                avatarSize="sm"
                profileLinkUserId={u.id}
                action={<FriendshipButton user={u} variant="inline" />}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/shell/cards/SuggestedPeopleCard.tsx
git commit -m "$(cat <<'EOF'
feat(shell): SuggestedPeopleCard uses live useSuggestedUsers data

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 26: `YouMightLikeCard` → live data

**Files:**
- Modify: `src/components/shell/cards/YouMightLikeCard.tsx` (full rewrite)

- [ ] **Step 1: Rewrite `src/components/shell/cards/YouMightLikeCard.tsx`**

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Link } from '@tanstack/react-router'
import { toast } from '@/components/ui/sonner'
import { FriendsSkeletonRow } from '@/components/friends/FriendsSkeletonRow'
import { FriendshipButton } from '@/components/friends/FriendshipButton'
import { useSuggestedUsers } from '@/features/friends/use-suggested-users'

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

export function YouMightLikeCard() {
  const query = useSuggestedUsers()
  const user = query.users[3]

  return (
    <section className="rounded-lg bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">You Might Like</h2>
        <button
          type="button"
          onClick={() => toast.info('Browse all coming soon')}
          className="text-xs text-muted-foreground hover:underline"
        >
          See All
        </button>
      </div>
      {query.isLoading ? (
        <FriendsSkeletonRow />
      ) : query.isError ? (
        <p className="text-xs text-muted-foreground">
          Couldn&apos;t load suggestions.
        </p>
      ) : !user ? (
        <p className="text-xs text-muted-foreground">No suggestions yet.</p>
      ) : (
        <div className="flex flex-col items-center text-center">
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            className="hover:opacity-80"
          >
            <Avatar className="size-16">
              {user.avatarUrl ? (
                <AvatarImage
                  src={user.avatarUrl}
                  alt={`${user.firstName} ${user.lastName}`}
                />
              ) : null}
              <AvatarFallback>
                {userInitials(user.firstName, user.lastName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link
            to="/users/$userId"
            params={{ userId: user.id }}
            className="mt-2 text-sm font-medium hover:underline"
          >
            {user.firstName} {user.lastName}
          </Link>
          <div className="mt-3 flex w-full items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast.info('Ignore coming soon')}
            >
              Ignore
            </Button>
            <FriendshipButton user={user} variant="primary" />
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/components/shell/cards/YouMightLikeCard.tsx
git commit -m "$(cat <<'EOF'
feat(shell): YouMightLikeCard uses live useSuggestedUsers slot 4

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 27: `AvatarMenu` — wire "Profile" link

**Files:**
- Modify: `src/components/shell/AvatarMenu.tsx` (replace lines 58-60)

- [ ] **Step 1: Read the file**

Run: `cat src/components/shell/AvatarMenu.tsx` (via Read tool) — the existing "Profile" item is on lines ~58-60 inside a `DropdownMenuItem` that calls `toast.info`. The current top imports are `toast`, DropdownMenu pieces, `Avatar*`, `useAuthStore`, `logoutCurrentDevice`.

- [ ] **Step 2: Add import for `Link`**

Add at top (preserving the existing import block style — match the file's quote style):

```ts
import { Link } from '@tanstack/react-router'
```

- [ ] **Step 3: Replace the "Profile" `DropdownMenuItem`**

Find:

```tsx
<DropdownMenuItem onClick={() => toast.info("Profile coming soon")}>
  Profile
</DropdownMenuItem>
```

Replace with:

```tsx
{user ? (
  <DropdownMenuItem asChild>
    <Link to="/users/$userId" params={{ userId: user.id }}>
      Profile
    </Link>
  </DropdownMenuItem>
) : (
  <DropdownMenuItem disabled>Profile</DropdownMenuItem>
)}
```

(Settings stays as `toast.info`. Logout stays.)

- [ ] **Step 4: Typecheck + lint + smoke**

Run: `pnpm typecheck && pnpm lint`. Then `pnpm dev` → click avatar → Profile → lands on `/users/<your id>`. No `FriendshipButton` rendered (self).

- [ ] **Step 5: Commit**

```bash
git add src/components/shell/AvatarMenu.tsx
git commit -m "$(cat <<'EOF'
feat(shell): wire AvatarMenu Profile link to /users/\$userId

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 28: Delete unused exports from `sample-shell.ts`

Spec §Open Items requires verifying no other file imports the deleted exports before the deletion commit lands.

**Files:**
- Modify: `src/data/sample-shell.ts` (delete lines 106-216)

- [ ] **Step 1: Verify the only importers are the three cards we just rewrote**

Use the Grep tool with `pattern: "SAMPLE_SUGGESTED_PEOPLE|SAMPLE_YOU_MIGHT_LIKE|SAMPLE_FRIENDS|SamplePerson|SampleFriend|FriendStatus"` and `path: "src"`.

Expected: matches only inside `src/data/sample-shell.ts`. (The three card files no longer import these after Tasks 24-26.) If any other file still imports them, fix that file before continuing.

- [ ] **Step 2: Delete lines 106-216 of `src/data/sample-shell.ts`**

Specifically remove:
- `export type SamplePerson = { … }` block
- `export const SAMPLE_SUGGESTED_PEOPLE: SamplePerson[] = [ … ]`
- `export const SAMPLE_YOU_MIGHT_LIKE: SamplePerson[] = [ … ]`
- `export type FriendStatus = …`
- `export type SampleFriend = { … }`
- `export const SAMPLE_FRIENDS: SampleFriend[] = [ … ]`

`EXPLORE_LINKS`, `SAMPLE_NOTIFICATIONS`, `SAMPLE_STORIES`, `SAMPLE_EVENTS` (and their accompanying types) remain.

- [ ] **Step 3: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors`, `0 warnings`. If typecheck flags an unused-import or missing-export somewhere, that means the Grep in Step 1 missed a consumer — fix that consumer.

- [ ] **Step 4: Commit**

```bash
git add src/data/sample-shell.ts
git commit -m "$(cat <<'EOF'
chore(data): remove now-unused sample friends + person fixtures

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 29: Manual smoke gate (spec §Testing Strategy)

The phase is not done until every item passes. Run `pnpm dev` (port 3000) with the backend on `:8787`, two test users A (you) and B (someone else).

- [ ] **Step 1: Phase C regression** — Cold-load `/`, post a comment, like a post. Confirm no breakage.

- [ ] **Step 2: Self-profile from AvatarMenu** — Click avatar → Profile → `/users/<A.id>` loads. No FriendshipButton. Your own posts list visible (or empty-self copy).

- [ ] **Step 3: Direct other-user profile** — Visit `/users/<B.id>`. Header + posts list render. FriendshipButton = "Connect" (assuming no prior relationship).

- [ ] **Step 4: Send request happy path** — Click Connect. Button flips to "Pending" instantly. Open `/friend-requests` → Outgoing lists B. Refresh → still pending.

- [ ] **Step 5: Send request failure** — Stop backend. Click Connect on user C. Button flips then snaps back ~100ms later + error toast. Restart backend; succeeds.

- [ ] **Step 6: Cancel outgoing** — On B's profile (Pending), click Pending → flips to Connect. Outgoing list no longer shows B. Refresh confirms.

- [ ] **Step 7: Receive incoming** — Have B's account send a request to A (via API or B-logged-in tab). A's `/friend-requests` Incoming shows B + Accept/Decline. B's profile shows Accept + Decline.

- [ ] **Step 8: Accept incoming** — Click Accept. Row removed from Incoming. `/friends` lists B at top. B's profile shows Friends.

- [ ] **Step 9: Decline incoming** — Repeat with user D, click Decline → row removed. D's profile → Connect.

- [ ] **Step 10: Unfriend** — From `/friends` or B's profile, click Friends. Row disappears. Profile → Connect. `/friends` reflects.

- [ ] **Step 11: Unfriend failure** — Kill backend, click Friends → flips then rolls back + error toast. Restart; retry succeeds.

- [ ] **Step 12: Sidebar Connect (SuggestedPeopleCard)** — Left sidebar shows 3 live users. Click Connect → Pending. `/friend-requests` Outgoing shows them.

- [ ] **Step 13: Sidebar Follow (YouMightLikeCard)** — Right sidebar shows 1 live user (slot 4). Click Follow → Pending.

- [ ] **Step 14: Sidebar Ignore** — Click Ignore → toast.info; no state change.

- [ ] **Step 15: YourFriendsCard live data** — Right sidebar "Your Friends" shows actual friends from step 8. No green dot. "See All" → `/friends`. Row click → profile.

- [ ] **Step 16: `/friends` infinite scroll** — With ≥21 friends (seed if needed), scroll. Next page loads with a skeleton briefly. Final page renders "You've seen all your friends".

- [ ] **Step 17: `/friend-requests` infinite scroll** — Same as 16 but for Incoming and Outgoing independently.

- [ ] **Step 18: Profile posts infinite scroll** — On a user with ≥21 posts, scroll. Next page loads.

- [ ] **Step 19: Invalid `userId`** — Visit `/users/00000000-0000-0000-0000-000000000000` → "User not found" card; no posts list.

- [ ] **Step 20: 409 conflict reconciliation** — Two tabs: from tab 2 send a request to B. In tab 1, click Connect on B's profile (cache stale). Optimistic flip to "Pending", server 409, rollback to "Connect", error toast, lists refetch, button settles on "Pending" again. **Tolerated outcome:** brief flicker; consistent end state.

- [ ] **Step 21: Dark mode legibility** — Toggle dark theme. Inspect `/friends`, `/friend-requests`, `/users/$userId`, sidebar rows, FriendshipButton variants, skeleton rows, error/empty cards. No contrast bugs.

- [ ] **Step 22: Logout regression** — Logout → `/auth/login`. Re-login → `/`. `/friends` and sidebars show no stale prior-user data.

- [ ] **Step 23: `pnpm typecheck`** — exits 0.

- [ ] **Step 24: `pnpm lint`** — exits 0, no warnings.

- [ ] **Step 25: `git status`** — clean. All Phase D commits land on `main`.

---

## Open Items / Risks (carry-over from spec)

- **Friendship-state drift past page 1.** `useFriendshipStatus` only sees loaded pages. If user has >20 friends or requests, an unseen entry on page 2+ may surface as `'none'` cold. Server validates; 409 path reconciles. Mitigation if it bites: prefetch all pages, or add a `GET /friends/relationship?userId=X` endpoint (out of frontend scope).
- **`useSuggestedUsers` may return self / friends / pending.** State-aware `FriendshipButton` renders the correct label in those rows ("Friends" / "Pending"). Mildly weird in a "Suggested" context but functionally correct.
- **No success toasts; no undo on unfriend / decline / cancel.** Misclick → re-send / re-accept manually.
- **Cross-cache fanout in feed-cache.ts patches caches keyed `feed` or `user-posts`.** If a future phase introduces a third post-list cache (e.g., `bookmarks`), it must also use a key starting with `feed` / `user-posts` or `isPostListQueryKey` needs extending.
- **No automated tests.** Same trade-off as Phases A-C. `friends-cache.ts` is the surface most likely to silently break; if a regression bites, retrofit unit tests there first.

---

## Self-Review

**Spec coverage:** Each numbered Build Order item in the spec maps to a Task (and several spec items group into shared infrastructure tasks 1-4). Sidebar surgery → Tasks 24-26; AvatarMenu → 27; sample deletion → 28; manual smoke → 29.

**Placeholder scan:** All code blocks contain complete, paste-ready code. No TBD / TODO / "fill in" markers.

**Type consistency:**
- `friendsQueryKey`, `incomingRequestsQueryKey`, `outgoingRequestsQueryKey`, `suggestedUsersQueryKey`, `userQueryKey(id)`, `userPostsQueryKey(id)` — names match across hook files and mutation files that import them.
- Mutation context shapes consistently include `userId` field so `FriendshipButton` / `FriendRequestRow` `useMutationState` filters can locate pending entries.
- `useSendFriendRequest` / `useAcceptFriendRequest` / `useDeleteFriendRelationship` all take `{ user: UserSummary }` (plus `mode` for delete) — keeps call sites symmetric.
- Generated mutation keys (`sendFriendRequestMutationKey`, `acceptFriendRequestMutationKey`, `deleteFriendRelationshipMutationKey`) are imported from the kubb-generated hook files for both the `mutationKey` option and the `useMutationState` filter — same source of truth.
- `patchPostInFeed` retained as a back-compat alias so Phase C's `feed-cache.ts` consumers (the rewritten mutations in Task 4) continue to typecheck.

If any executor finds a divergence (e.g., a generated mutation-key name differs in the codegen), fix at the source and continue.

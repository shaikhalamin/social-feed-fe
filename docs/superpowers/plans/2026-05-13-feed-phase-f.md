# Feed (Phase F) — Comment Engagement, Like Previews & Account Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every Phase A–E gap that has a backend endpoint but no UI: comment likes / unlikes, one-level comment replies with lazy expansion, like-preview hover-cards on posts and comments, and account deletion via AvatarMenu gated by type-to-confirm.

**Architecture:** New `useToggleCommentLike(postId)` hook mirrors the existing `useTogglePostLike()`, with cache fan-out that walks both the top-level comments cache and every reply cache for the post. Replies live in a sibling `InfiniteData` cache keyed `['comments', postId, 'replies', commentId, 'infinite']` — the existing `patchCommentInList` / `removeCommentFromList` helpers apply unchanged. Like previews are wrapped in a new shadcn `HoverCard` primitive; the panel uses each entity's embedded `likesPreview` as `initialData` and refreshes in the background with `staleTime: 30s`. Account deletion lives inside the existing `AvatarMenu` dropdown, opening a new `AlertDialog`-based `DeleteAccountDialog` that requires the user to type their email before the Delete button enables. Two existing Phase E hooks (`useUpdateCommentMutation`, `useDeleteCommentMutation`) get a small enhancement so they patch wherever the comment lives (top-level cache or any reply cache) and so reply delete ticks the parent's `counters.replies` down.

**Tech Stack:** React 19, TanStack Query 5 (`useMutation` + `useInfiniteQuery` + `setQueryData` over `InfiniteData`), TanStack Router (no new routes), Tailwind v4, shadcn primitives (new: `HoverCard`; reused: `DropdownMenu`, `AlertDialog`, `Avatar`, `Input`, `Button`, `Separator`), `lucide-react` icons (`Heart`, `Trash2`, `MessageCircle`, `ChevronDown`), `sonner` toasts, Zustand (`useAuthStore`), Kubb-generated clients / hooks / types under `src/gen/api/`. `BroadcastChannel('auth')` for cross-tab logout on account deletion.

**Spec:** `docs/superpowers/specs/2026-05-13-feed-phase-f-design.md`

**Testing note (deviation from default writing-plans):** Per the approved spec (§Non-Goals and §Testing Strategy), Phase F is gated by a manual smoke checklist instead of unit tests — consistent with Phases A / B / C / D / E. The final task runs the spec's 35-item smoke gate. `pnpm typecheck` and `pnpm lint` exit 0 after every commit.

---

## File Map

**Created:**
- `src/components/ui/hover-card.tsx` — shadcn `HoverCard` primitive (added via `pnpm dlx shadcn@latest add hover-card`).
- `src/features/feed/use-toggle-comment-like.ts` — co-locates `useLikeComment` + `useUnlikeComment`, mirrors `use-toggle-post-like.ts`.
- `src/features/feed/use-create-comment-reply.ts` — optimistic prepend to reply cache + bumps parent's `counters.replies`.
- `src/features/feed/use-list-comment-replies.ts` — `useInfiniteQuery` wrapper enabled only while the replies list is expanded.
- `src/features/feed/use-post-likes-preview.ts` — `useQuery` with `initialData` from `post.likesPreview`.
- `src/features/feed/use-comment-likes-preview.ts` — `useQuery` with `initialData` from `comment.likesPreview`.
- `src/features/auth/use-delete-account.ts` — wraps `useDeleteUser` + clears caches + clears auth + broadcasts logout + redirects.
- `src/components/feed/CommentLikeButton.tsx` — heart + count, wraps count in `<LikesPreviewHoverCard>`.
- `src/components/feed/CommentReplyButton.tsx` — `Reply` ghost button.
- `src/components/feed/CommentReplyComposer.tsx` — inline textarea + Reply / Cancel.
- `src/components/feed/CommentRepliesList.tsx` — `↳ View N replies` expander + paginated reply list.
- `src/components/feed/LikesPreviewHoverCard.tsx` — single primitive used by post and comment like-counts.
- `src/components/shell/DeleteAccountDialog.tsx` — type-to-confirm `AlertDialog`.

**Modified:**
- `src/features/feed/feed-cache.ts` — append `patchCommentLike`, `bumpCommentReplyCount`, `patchLikesPreviewAddViewer`, `patchLikesPreviewRemoveViewer`, `prependReplyToPages`, `findCommentInAllCaches`, `patchCommentInAllCaches`, `removeCommentFromAllCaches`. No changes to existing exports.
- `src/features/feed/use-update-comment.ts` — switch from single-cache `patchCommentInList` to `patchCommentInAllCaches`. Restore tuples on error. No external API change.
- `src/features/feed/use-delete-comment.ts` — use `findCommentInAllCaches` + `removeCommentFromAllCaches`. When deleted comment has `parentCommentId !== null`, also bump parent's `counters.replies` down by 1. The post comment-counter decrement is preserved.
- `src/components/feed/PostCardCounters.tsx` — wrap the like-count text + heart icon in `<LikesPreviewHoverCard kind="post" id={post.id} embedded={post.likesPreview}>`.
- `src/components/feed/CommentRow.tsx` — accept `isReply?: boolean` prop (default `false`). Indent with `pl-10` when `isReply`. Below content, render action row with `<CommentLikeButton>` + (when `!isReply`) `<CommentReplyButton>`. When `!isReply && replyOpen`, render `<CommentReplyComposer>`. When `!isReply`, render `<CommentRepliesList>`.
- `src/components/shell/AvatarMenu.tsx` — add `<DropdownMenuSeparator />` + destructive `Delete account` item below Logout. Locally manage `deleteOpen` state and mount `<DeleteAccountDialog>` outside `DropdownMenuContent`.

**Untouched:**
- Phase A auth (refresh, logout-current-device, BroadcastChannel handler in `__root.tsx`).
- Phase B shell layout, routes, theme toggle.
- Phase C feed, post composer, post like, comment composer, comment list.
- Phase D friends, sidebar, profile header (other than what Phase E already touched).
- Phase E media uploads, post owner menu, comment owner menu, post-visibility flip, profile name edit.
- `src/gen/api/**` (regenerated, never hand-edited).
- All other routes and components.

---

## Conventions

- **No semicolons, single quotes, trailing commas.** Match Phase C / D / E style in surrounding files.
- **Imports use `.ts` extensions** for files under `@/gen/api/`. Internal feature modules omit the extension where Phase C/D/E does.
- **`import type`** for any type-only import (required by `verbatimModuleSyntax`).
- **No `any`, no `as any`, no `!`, no eslint/ts disable** (per CLAUDE.md). Narrow with `instanceof`, `in`, or type guards.
- **No inline `import()`.** All imports are top-of-file static `import` / `import type`.
- **Toast import:** `import { toast } from '@/components/ui/sonner'`. Failure → `toast.error("Couldn't …")`. **No success toasts.**
- **Per-file `authorInitials` / `userInitials` helper** (not shared) — matches the existing Phase C/D/E pattern. For the new `LikesPreviewHoverCard`, define a local `viewerInitials(first, last)` helper.
- **Optimistic-mutation protocol** (mirror Phase C/D/E exactly):
  1. `await queryClient.cancelQueries({ queryKey })` for each affected key (top-level comments key, every reply cache via predicate, preview key, etc.).
  2. Snapshot via `queryClient.getQueryData(...)` and/or `queryClient.getQueriesData({ predicate })`.
  3. Patch through the pure helper in `feed-cache.ts`.
  4. Return a `context` containing each snapshot tuple list.
  5. `onError`: restore each snapshot, then `toast.error(...)`.
  6. **No `onSettled` refetch.**
- **`AlertDialog`** for the delete-account confirm only. Like / unlike / reply / expand-replies have no confirmation.

---

## Task 1: Add shadcn `HoverCard` primitive

**Files:**
- Create: `src/components/ui/hover-card.tsx` (generated)

- [ ] **Step 1: Run shadcn add**

```bash
pnpm dlx shadcn@latest add hover-card
```

Expected: prints "Created file" for `src/components/ui/hover-card.tsx`. If `@radix-ui/react-hover-card` is not yet installed, the command adds it.

- [ ] **Step 2: Sanity-check the file**

Read `src/components/ui/hover-card.tsx`. Confirm it exports `HoverCard`, `HoverCardTrigger`, `HoverCardContent`. The file is generated — do not hand-edit beyond Prettier formatting.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/hover-card.tsx pnpm-lock.yaml package.json
git commit -m "chore(ui): add shadcn HoverCard primitive for Phase F like previews"
```

---

## Task 2: Extend `feed-cache.ts` with comment-like and reply helpers

**Files:**
- Modify: `src/features/feed/feed-cache.ts`

- [ ] **Step 1: Add imports for `LikesPreview` and `ReactionUserSummary` at the top**

At the top of `src/features/feed/feed-cache.ts`, alongside existing imports, add:

```ts
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'
import type { ReactionUserSummary } from '@/gen/api/types/ReactionUserSummary.ts'
```

- [ ] **Step 2: Append the new comment / preview / reply helpers**

Append to the bottom of `src/features/feed/feed-cache.ts`:

```ts
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
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/features/feed/feed-cache.ts
git commit -m "feat(feed): add comment-like + reply cache helpers for Phase F"
```

---

## Task 3: Enhance `useUpdateCommentMutation` for reply-cache walk

**Files:**
- Modify: `src/features/feed/use-update-comment.ts`

- [ ] **Step 1: Replace the file body**

Replace the entire contents of `src/features/feed/use-update-comment.ts` with:

```ts
import { useUpdateComment } from '@/gen/api/hooks/useUpdateComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { CommentCacheTuple } from './feed-cache'
import {
  cancelCommentCachesForPost,
  patchCommentInAllCaches,
  restoreCommentCaches,
} from './feed-cache'

type UpdateCommentContext = { snapshots: CommentCacheTuple[] }

export function useUpdateCommentMutation(postId: string) {
  return useUpdateComment<UpdateCommentContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        await cancelCommentCachesForPost(queryClient, postId)
        const nowIso = new Date().toISOString()
        const snapshots = patchCommentInAllCaches(
          queryClient,
          postId,
          id,
          (c) => ({
            ...c,
            content: data.content,
            isEdited: true,
            updatedAt: nowIso,
          }),
        )
        return { snapshots }
      },
      onError: (_err, _vars, context) => {
        if (context) restoreCommentCaches(queryClient, context.snapshots)
        toast.error("Couldn't update comment")
      },
    },
  })
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-update-comment.ts
git commit -m "feat(feed): walk reply caches in useUpdateCommentMutation"
```

---

## Task 4: Enhance `useDeleteCommentMutation` for reply-cache walk + parent counter

**Files:**
- Modify: `src/features/feed/use-delete-comment.ts`

- [ ] **Step 1: Replace the file body**

Replace the entire contents of `src/features/feed/use-delete-comment.ts` with:

```ts
import { useDeleteComment } from '@/gen/api/hooks/useDeleteComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { commentsQueryKey } from './use-post-comments'
import type { CommentCacheTuple, PostListSnapshot } from './feed-cache'
import {
  bumpCommentReplyCount,
  cancelCommentCachesForPost,
  cancelPostListQueries,
  findCommentInAllCaches,
  patchAllPostListCaches,
  patchCommentInAllCaches,
  removeCommentFromAllCaches,
  restoreCommentCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type DeleteCommentContext = {
  removeSnapshots: CommentCacheTuple[]
  parentCounterSnapshots: CommentCacheTuple[]
  postListSnapshot: PostListSnapshot
}

export function useDeleteCommentMutation(postId: string) {
  return useDeleteComment<DeleteCommentContext>({
    mutation: {
      onMutate: async ({ id }) => {
        await Promise.all([
          cancelCommentCachesForPost(queryClient, postId),
          cancelPostListQueries(queryClient),
        ])
        const found = findCommentInAllCaches(queryClient, postId, id)
        const parentId = found?.comment.parentCommentId ?? null
        const removeSnapshots = removeCommentFromAllCaches(
          queryClient,
          postId,
          id,
        )
        const parentCounterSnapshots: CommentCacheTuple[] = parentId
          ? patchCommentInAllCaches(queryClient, postId, parentId, (c) =>
              bumpCommentReplyCount(c, -1),
            )
          : []
        const postListSnapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, postId, (p) => ({
          ...p,
          counters: {
            ...p.counters,
            comments: Math.max(0, p.counters.comments - 1),
          },
        }))
        return { removeSnapshots, parentCounterSnapshots, postListSnapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          restoreCommentCaches(queryClient, context.removeSnapshots)
          restoreCommentCaches(queryClient, context.parentCounterSnapshots)
          restorePostListCaches(queryClient, context.postListSnapshot)
        }
        toast.error("Couldn't delete comment")
      },
    },
  })
}

// Keep commentsQueryKey re-export for any callers that still use it.
export { commentsQueryKey }
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-delete-comment.ts
git commit -m "feat(feed): walk reply caches + bump parent reply counter in useDeleteCommentMutation"
```

---

## Task 5: Add `useToggleCommentLike` hook

**Files:**
- Create: `src/features/feed/use-toggle-comment-like.ts`

- [ ] **Step 1: Create the file**

Create `src/features/feed/use-toggle-comment-like.ts` with:

```ts
import { useLikeComment } from '@/gen/api/hooks/useLikeComment.ts'
import { useUnlikeComment } from '@/gen/api/hooks/useUnlikeComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import type { Comment } from '@/gen/api/types/Comment.ts'
import type {
  GetCommentLikesPreviewQueryResponse,
} from '@/gen/api/types/GetCommentLikesPreview.ts'
import type { ReactionUserSummary } from '@/gen/api/types/ReactionUserSummary.ts'
import type { CommentCacheTuple } from './feed-cache'
import {
  cancelCommentCachesForPost,
  patchCommentInAllCaches,
  patchCommentLike,
  patchLikesPreviewAddViewer,
  patchLikesPreviewRemoveViewer,
  restoreCommentCaches,
} from './feed-cache'

export function commentLikesPreviewQueryKey(commentId: string) {
  return ['comment-likes-preview', commentId] as const
}

type ToggleContext = {
  commentSnapshots: CommentCacheTuple[]
  previewSnapshot: GetCommentLikesPreviewQueryResponse | undefined
  liked: boolean
}

function getViewerSummary(): ReactionUserSummary | null {
  const user = useAuthStore.getState().user
  if (!user) return null
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
  }
}

async function runOptimisticToggle(
  postId: string,
  commentId: string,
  liked: boolean,
): Promise<ToggleContext> {
  const viewer = getViewerSummary()
  const previewKey = commentLikesPreviewQueryKey(commentId)
  await Promise.all([
    cancelCommentCachesForPost(queryClient, postId),
    queryClient.cancelQueries({ queryKey: previewKey }),
  ])
  const commentSnapshots = viewer
    ? patchCommentInAllCaches(queryClient, postId, commentId, (c) =>
        patchCommentLike(c, liked, viewer),
      )
    : []
  const previewSnapshot =
    queryClient.getQueryData<GetCommentLikesPreviewQueryResponse>(previewKey)
  if (viewer) {
    queryClient.setQueryData<GetCommentLikesPreviewQueryResponse>(
      previewKey,
      (prev) =>
        prev
          ? {
              data: liked
                ? patchLikesPreviewAddViewer(prev.data, viewer)
                : patchLikesPreviewRemoveViewer(prev.data, viewer.id),
            }
          : prev,
    )
  }
  return { commentSnapshots, previewSnapshot, liked }
}

function restoreToggle(
  commentId: string,
  context: ToggleContext | undefined,
): void {
  if (!context) return
  restoreCommentCaches(queryClient, context.commentSnapshots)
  queryClient.setQueryData<GetCommentLikesPreviewQueryResponse>(
    commentLikesPreviewQueryKey(commentId),
    context.previewSnapshot,
  )
}

export function useToggleCommentLike(postId: string) {
  const like = useLikeComment<ToggleContext>({
    mutation: {
      onMutate: ({ comment_id }) =>
        runOptimisticToggle(postId, comment_id, true),
      onError: (_err, vars, context) => {
        restoreToggle(vars.comment_id, context)
        toast.error("Couldn't update like")
      },
    },
  })

  const unlike = useUnlikeComment<ToggleContext>({
    mutation: {
      onMutate: ({ comment_id }) =>
        runOptimisticToggle(postId, comment_id, false),
      onError: (_err, vars, context) => {
        restoreToggle(vars.comment_id, context)
        toast.error("Couldn't update like")
      },
    },
  })

  const toggle = (comment: Comment) => {
    if (comment.viewerState.liked) {
      unlike.mutate({ comment_id: comment.id })
    } else {
      like.mutate({ comment_id: comment.id })
    }
  }

  const isPending = (commentId: string): boolean => {
    if (like.isPending && like.variables?.comment_id === commentId) return true
    if (unlike.isPending && unlike.variables?.comment_id === commentId)
      return true
    return false
  }

  return { toggle, isPending }
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`. (If the generated `useLikeComment` / `useUnlikeComment` mutation hooks use a different param name like `commentId` instead of `comment_id`, the typecheck failure will name the right field — update both call sites in this file to match.)

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-toggle-comment-like.ts
git commit -m "feat(feed): add useToggleCommentLike mirroring useTogglePostLike"
```

---

## Task 6: Add `useCreateCommentReplyMutation` hook

**Files:**
- Create: `src/features/feed/use-create-comment-reply.ts`

- [ ] **Step 1: Create the file**

Create `src/features/feed/use-create-comment-reply.ts` with:

```ts
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
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`. (Note: `useCreateCommentReply` hook variables shape — if it takes `comment_id` instead of `commentId` in mutate args, this file uses neither because the parent id is closed over by the hook factory, but the call site in step 2 of Task 12 will pass the correct field.)

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-create-comment-reply.ts
git commit -m "feat(feed): add useCreateCommentReplyMutation with optimistic reply"
```

---

## Task 7: Add `useListCommentReplies` infinite query hook

**Files:**
- Create: `src/features/feed/use-list-comment-replies.ts`

- [ ] **Step 1: Create the file**

Create `src/features/feed/use-list-comment-replies.ts` with:

```ts
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
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/features/feed/use-list-comment-replies.ts
git commit -m "feat(feed): add useListCommentReplies infinite query"
```

---

## Task 8: Add likes-preview query hooks

**Files:**
- Create: `src/features/feed/use-post-likes-preview.ts`
- Create: `src/features/feed/use-comment-likes-preview.ts`

- [ ] **Step 1: Create `use-post-likes-preview.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { getPostLikesPreview } from '@/gen/api/clients/getPostLikesPreview.ts'
import type { GetPostLikesPreviewQueryResponse } from '@/gen/api/types/GetPostLikesPreview.ts'
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'

export function postLikesPreviewQueryKey(postId: string) {
  return ['post-likes-preview', postId] as const
}

export function usePostLikesPreview(
  postId: string,
  embedded: LikesPreview,
  enabled: boolean,
) {
  return useQuery<GetPostLikesPreviewQueryResponse>({
    queryKey: postLikesPreviewQueryKey(postId),
    queryFn: () => getPostLikesPreview({ post_id: postId }),
    initialData: { data: embedded },
    staleTime: 30_000,
    refetchOnMount: 'always',
    enabled,
  })
}
```

- [ ] **Step 2: Create `use-comment-likes-preview.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { getCommentLikesPreview } from '@/gen/api/clients/getCommentLikesPreview.ts'
import type { GetCommentLikesPreviewQueryResponse } from '@/gen/api/types/GetCommentLikesPreview.ts'
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'
import { commentLikesPreviewQueryKey } from './use-toggle-comment-like'

export function useCommentLikesPreview(
  commentId: string,
  embedded: LikesPreview,
  enabled: boolean,
) {
  return useQuery<GetCommentLikesPreviewQueryResponse>({
    queryKey: commentLikesPreviewQueryKey(commentId),
    queryFn: () => getCommentLikesPreview({ comment_id: commentId }),
    initialData: { data: embedded },
    staleTime: 30_000,
    refetchOnMount: 'always',
    enabled,
  })
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/features/feed/use-post-likes-preview.ts src/features/feed/use-comment-likes-preview.ts
git commit -m "feat(feed): add post + comment likes-preview query hooks"
```

---

## Task 9: Add `useDeleteAccount` hook

**Files:**
- Create: `src/features/auth/use-delete-account.ts`

- [ ] **Step 1: Verify the auth helper exports**

Read `src/lib/auth.ts`. Confirm `clearAuth` is exported and `AUTH_CHANNEL` (a `BroadcastChannel`) exists at module scope. If the channel is not exported, prefer constructing a local `new BroadcastChannel('auth')` inside `onSuccess` rather than importing the private constant — the existing `__root.tsx` listener does not care about identity, only about the message payload.

- [ ] **Step 2: Create the hook**

Create `src/features/auth/use-delete-account.ts` with:

```ts
import { useNavigate } from '@tanstack/react-router'
import { useDeleteUser } from '@/gen/api/hooks/useDeleteUser.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { clearAuth } from '@/lib/auth'
import { useAuthStore } from '@/hooks/use-auth'

export function useDeleteAccount() {
  const navigate = useNavigate()
  return useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.clear()
        clearAuth()
        useAuthStore.getState().reset()
        const channel = new BroadcastChannel('auth')
        channel.postMessage({ type: 'logout' })
        channel.close()
        void navigate({ to: '/auth/login' })
      },
      onError: () => {
        toast.error("Couldn't delete account")
      },
    },
  })
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/features/auth/use-delete-account.ts
git commit -m "feat(auth): add useDeleteAccount with cache clear + cross-tab logout"
```

---

## Task 10: Add `LikesPreviewHoverCard` component

**Files:**
- Create: `src/components/feed/LikesPreviewHoverCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import type { ReactNode } from 'react'
import { useState } from 'react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { usePostLikesPreview } from '@/features/feed/use-post-likes-preview'
import { useCommentLikesPreview } from '@/features/feed/use-comment-likes-preview'
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'
import type { ReactionUserSummary } from '@/gen/api/types/ReactionUserSummary.ts'

function viewerInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

function fullName(viewer: ReactionUserSummary): string {
  return [viewer.firstName, viewer.lastName].filter(Boolean).join(' ')
}

type Props = {
  kind: 'post' | 'comment'
  id: string
  embedded: LikesPreview
  children: ReactNode
}

function HoverCardBody({
  preview,
}: {
  preview: LikesPreview
}) {
  const others = preview.count - preview.preview.length
  return (
    <div className="flex w-60 flex-col gap-2">
      {preview.preview.length === 0 ? (
        <div className="text-sm text-muted-foreground">No likers yet.</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {preview.preview.map((viewer) => (
            <li key={viewer.id} className="flex items-center gap-2">
              <Avatar size="sm">
                <AvatarImage
                  src={viewer.avatarUrl ?? undefined}
                  alt={fullName(viewer)}
                />
                <AvatarFallback>
                  {viewerInitials(viewer.firstName, viewer.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{fullName(viewer)}</span>
            </li>
          ))}
        </ul>
      )}
      {others > 0 ? (
        <div className="border-t pt-2 text-xs text-muted-foreground">
          and {others} {others === 1 ? 'other' : 'others'}
        </div>
      ) : null}
    </div>
  )
}

function PostHoverContent({
  id,
  embedded,
  open,
}: {
  id: string
  embedded: LikesPreview
  open: boolean
}) {
  const { data } = usePostLikesPreview(id, embedded, open)
  return <HoverCardBody preview={data?.data ?? embedded} />
}

function CommentHoverContent({
  id,
  embedded,
  open,
}: {
  id: string
  embedded: LikesPreview
  open: boolean
}) {
  const { data } = useCommentLikesPreview(id, embedded, open)
  return <HoverCardBody preview={data?.data ?? embedded} />
}

export function LikesPreviewHoverCard({ kind, id, embedded, children }: Props) {
  const [open, setOpen] = useState(false)
  if (embedded.count === 0) return <>{children}</>
  return (
    <HoverCard openDelay={300} closeDelay={150} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align="start" className="p-3">
        {kind === 'post' ? (
          <PostHoverContent id={id} embedded={embedded} open={open} />
        ) : (
          <CommentHoverContent id={id} embedded={embedded} open={open} />
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/LikesPreviewHoverCard.tsx
git commit -m "feat(feed): add LikesPreviewHoverCard for post + comment like counts"
```

---

## Task 11: Add `CommentLikeButton` component

**Files:**
- Create: `src/components/feed/CommentLikeButton.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToggleCommentLike } from '@/features/feed/use-toggle-comment-like'
import type { Comment } from '@/gen/api/types/Comment.ts'
import { LikesPreviewHoverCard } from './LikesPreviewHoverCard'

type Props = {
  comment: Comment
  postId: string
}

export function CommentLikeButton({ comment, postId }: Props) {
  const { toggle, isPending } = useToggleCommentLike(postId)
  const liked = comment.viewerState.liked
  const pending = isPending(comment.id)
  const count = comment.counters.likes

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <button
        type="button"
        onClick={() => toggle(comment)}
        disabled={pending}
        aria-label={liked ? 'Unlike comment' : 'Like comment'}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium hover:bg-muted',
          liked ? 'text-red-500' : 'text-muted-foreground',
        )}
      >
        <Heart className={cn('size-3.5', liked && 'fill-red-500')} />
        <span>Like</span>
      </button>
      {count > 0 ? (
        <LikesPreviewHoverCard
          kind="comment"
          id={comment.id}
          embedded={comment.likesPreview}
        >
          <span className="cursor-default text-muted-foreground">{count}</span>
        </LikesPreviewHoverCard>
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/CommentLikeButton.tsx
git commit -m "feat(feed): add CommentLikeButton with hover-card-wrapped count"
```

---

## Task 12: Add `CommentReplyComposer` and `CommentReplyButton` components

**Files:**
- Create: `src/components/feed/CommentReplyButton.tsx`
- Create: `src/components/feed/CommentReplyComposer.tsx`

- [ ] **Step 1: Create `CommentReplyButton.tsx`**

```tsx
import { Button } from '@/components/ui/button'

type Props = {
  onClick: () => void
  disabled?: boolean
}

export function CommentReplyButton({ onClick, disabled = false }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-auto px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
    >
      Reply
    </Button>
  )
}
```

- [ ] **Step 2: Create `CommentReplyComposer.tsx`**

```tsx
import { useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useCreateCommentReplyMutation } from '@/features/feed/use-create-comment-reply'

type Props = {
  postId: string
  parentCommentId: string
  onCancel: () => void
  onSuccess: () => void
}

export function CommentReplyComposer({
  postId,
  parentCommentId,
  onCancel,
  onSuccess,
}: Props) {
  const [content, setContent] = useState('')
  const mutation = useCreateCommentReplyMutation(postId, parentCommentId)
  const trimmed = content.trim()
  const canSubmit = trimmed.length > 0 && !mutation.isPending

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      { comment_id: parentCommentId, data: { content: trimmed } },
      { onSuccess: () => onSuccess() },
    )
  }

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mt-2 space-y-2 pl-10">
      <textarea
        value={content}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoFocus
        rows={2}
        placeholder="Write a reply…"
        aria-label="Write a reply"
        className="w-full resize-none rounded-2xl bg-muted px-3 py-2 text-sm focus:outline-none"
      />
      <div className="flex gap-2">
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={submit}
          disabled={!canSubmit}
        >
          Reply
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
```

Note: this assumes the generated `useCreateCommentReply` mutation accepts `{ comment_id, data }` (matching `useCreateComment`). If the typecheck reports a different shape, adjust the `mutation.mutate` call accordingly — the parent id is also closed over via `useCreateCommentReplyMutation(postId, parentCommentId)`, so this argument is redundant-but-required by the mutation hook's signature.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`. If `useCreateCommentReply` uses `comment_id` differently, update step 2's `mutate` call to match.

- [ ] **Step 4: Commit**

```bash
git add src/components/feed/CommentReplyButton.tsx src/components/feed/CommentReplyComposer.tsx
git commit -m "feat(feed): add CommentReplyButton + CommentReplyComposer"
```

---

## Task 13: Add `CommentRepliesList` component

**Files:**
- Create: `src/components/feed/CommentRepliesList.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState, useMemo } from 'react'
import { ChevronDown, CornerDownRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useListCommentReplies } from '@/features/feed/use-list-comment-replies'
import { CommentRow } from './CommentRow'

type Props = {
  postId: string
  parentCommentId: string
  replyCount: number
}

export function CommentRepliesList({
  postId,
  parentCommentId,
  replyCount,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const query = useListCommentReplies(
    { postId, parentCommentId },
    { enabled: expanded },
  )

  const replies = query.replies
  const skeletonCount = useMemo(
    () => Math.min(3, Math.max(1, replyCount)),
    [replyCount],
  )

  if (replyCount === 0 && replies.length === 0) return null

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-1 inline-flex items-center gap-1.5 pl-10 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <CornerDownRight className="size-3.5" />
        View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
      </button>
    )
  }

  return (
    <div className="mt-2 space-y-3">
      {query.isLoading
        ? Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="ml-10 h-12 animate-pulse rounded-2xl bg-muted/60"
            />
          ))
        : replies.map((reply) => (
            <CommentRow
              key={reply.id}
              comment={reply}
              postId={postId}
              isReply
            />
          ))}
      {query.hasNextPage ? (
        <div className="pl-10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="h-auto px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
          >
            <ChevronDown className="mr-1 size-3.5" />
            {query.isFetchingNextPage
              ? 'Loading…'
              : 'Show more replies'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
```

Note: `CommentRow` is imported from a sibling file that will be modified in Task 16 to accept the `isReply` prop. Both `CommentRepliesList` and `CommentRow` reference each other (CommentRow → CommentRepliesList for the expander, CommentRepliesList → CommentRow for each reply). The cycle resolves fine because Vite + esbuild handle peer imports between modules; both files must exist before either typecheck passes — Task 16 is the natural sync point. Until then, this file will fail typecheck. **Do not run typecheck after step 1 alone — defer it to Task 16.**

- [ ] **Step 2: Commit (without running typecheck — typecheck runs after Task 16)**

```bash
git add src/components/feed/CommentRepliesList.tsx
git commit -m "feat(feed): add CommentRepliesList with collapsed expander"
```

---

## Task 14: Add `DeleteAccountDialog` component

**Files:**
- Create: `src/components/shell/DeleteAccountDialog.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/hooks/use-auth'
import { useDeleteAccount } from '@/features/auth/use-delete-account'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({ open, onOpenChange }: Props) {
  const user = useAuthStore((s) => s.user)
  const [typed, setTyped] = useState('')
  const mutation = useDeleteAccount()
  const email = user?.email ?? ''
  const matches = typed.trim() === email && email.length > 0
  const showMismatch = typed.length > 0 && !matches

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return
    if (!next) setTyped('')
    onOpenChange(next)
  }

  const onConfirm = () => {
    if (!matches || !user) return
    mutation.mutate({ id: user.id })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes your account, posts, comments, and avatar.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <label
            htmlFor="delete-account-confirm"
            className="text-sm text-muted-foreground"
          >
            Type your email to confirm:{' '}
            <strong className="text-foreground">{email}</strong>
          </label>
          <Input
            id="delete-account-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            disabled={mutation.isPending}
          />
          {showMismatch ? (
            <p className="text-xs text-destructive">
              The email doesn&apos;t match.
            </p>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={!matches || mutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 2: Verify `Input` primitive exists**

Run: `ls src/components/ui/input.tsx`
Expected: file exists. If not, add it: `pnpm dlx shadcn@latest add input` (then commit the generated file before continuing).

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`. (The `AlertDialogAction`'s `onClick` does not auto-close the dialog when the action is destructive — that's intentional; `onOpenChange` handles open/close. If shadcn's `AlertDialogAction` does auto-close, the visible result is the dialog dismisses while the mutation resolves; the loader-in-button still flashes, which is acceptable.)

- [ ] **Step 4: Commit**

```bash
git add src/components/shell/DeleteAccountDialog.tsx
git commit -m "feat(shell): add DeleteAccountDialog with type-to-confirm"
```

---

## Task 15: Modify `PostCardCounters.tsx` to wrap like-count

**Files:**
- Modify: `src/components/feed/PostCardCounters.tsx`

- [ ] **Step 1: Replace the file body**

Replace `src/components/feed/PostCardCounters.tsx` with:

```tsx
import { Heart } from 'lucide-react'
import type { Post } from '@/gen/api/types/Post.ts'
import { LikesPreviewHoverCard } from './LikesPreviewHoverCard'

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
          <LikesPreviewHoverCard
            kind="post"
            id={post.id}
            embedded={post.likesPreview}
          >
            <span className="inline-flex cursor-default items-center gap-1">
              <Heart className="size-3.5 fill-red-500 text-red-500" />
              <span>{likes}</span>
            </span>
          </LikesPreviewHoverCard>
        ) : null}
      </div>
      <div>
        {comments > 0 ? `${comments} Comment${comments === 1 ? '' : 's'}` : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostCardCounters.tsx
git commit -m "feat(feed): wrap post like-count in LikesPreviewHoverCard"
```

---

## Task 16: Modify `CommentRow.tsx` to render Phase F affordances

**Files:**
- Modify: `src/components/feed/CommentRow.tsx`

- [ ] **Step 1: Replace the file body**

Replace `src/components/feed/CommentRow.tsx` with:

```tsx
import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/hooks/use-auth'
import { useUpdateCommentMutation } from '@/features/feed/use-update-comment'
import type { Comment } from '@/gen/api/types/Comment.ts'
import { CommentOwnerMenu } from './CommentOwnerMenu'
import { CommentLikeButton } from './CommentLikeButton'
import { CommentReplyButton } from './CommentReplyButton'
import { CommentReplyComposer } from './CommentReplyComposer'
import { CommentRepliesList } from './CommentRepliesList'

function authorInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

type Props = {
  comment: Comment
  postId: string
  pending?: boolean
  isReply?: boolean
}

export function CommentRow({
  comment,
  postId,
  pending = false,
  isReply = false,
}: Props) {
  const fullName =
    `${comment.author.firstName} ${comment.author.lastName}`.trim()
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const isOwner = currentUserId === comment.author.id
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
  const [replyOpen, setReplyOpen] = useState(false)
  const updateMutation = useUpdateCommentMutation(postId)

  const trimmed = draft.trim()
  const canSave = trimmed.length > 0 && trimmed !== comment.content

  const startEdit = () => {
    setDraft(comment.content)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setDraft(comment.content)
    setIsEditing(false)
  }

  const save = () => {
    if (!canSave) return
    updateMutation.mutate(
      { id: comment.id, data: { content: trimmed } },
      { onSuccess: () => setIsEditing(false) },
    )
  }

  const onTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      save()
    }
  }

  return (
    <div className={cn(isReply && 'pl-10')}>
      <div className={cn('group flex gap-2', pending && 'opacity-70')}>
        <Avatar size="sm">
          <AvatarImage
            src={comment.author.avatarUrl ?? undefined}
            alt={fullName}
          />
          <AvatarFallback>
            {authorInitials(comment.author.firstName, comment.author.lastName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onTextareaKeyDown}
                autoFocus
                rows={2}
                aria-label="Edit comment"
                className="w-full resize-none rounded-2xl bg-muted px-3 py-2 text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={save}
                  disabled={!canSave || updateMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-muted px-3 py-2">
              <div className="text-sm font-semibold">{fullName}</div>
              <div className="whitespace-pre-line text-sm">
                {comment.content}
              </div>
            </div>
          )}
          <div className="mt-1 flex items-center gap-3 px-3 text-xs text-muted-foreground">
            <span>{formatTimeAgo(comment.createdAt)}</span>
            {comment.isEdited ? <span>· Edited</span> : null}
            <CommentLikeButton comment={comment} postId={postId} />
            {!isReply ? (
              <CommentReplyButton
                onClick={() => setReplyOpen(true)}
                disabled={replyOpen}
              />
            ) : null}
          </div>
        </div>
        {isOwner && !isEditing ? (
          <CommentOwnerMenu
            comment={comment}
            postId={postId}
            onEdit={startEdit}
          />
        ) : null}
      </div>
      {!isReply && replyOpen ? (
        <CommentReplyComposer
          postId={postId}
          parentCommentId={comment.id}
          onCancel={() => setReplyOpen(false)}
          onSuccess={() => setReplyOpen(false)}
        />
      ) : null}
      {!isReply ? (
        <CommentRepliesList
          postId={postId}
          parentCommentId={comment.id}
          replyCount={comment.counters.replies}
        />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`. This is the first time the `CommentRow` ↔ `CommentRepliesList` cycle resolves cleanly — both files must exist with the right shapes for typecheck to pass. If a type error names `isReply`, double-check that `CommentRow`'s `Props` type includes it (step 1 above).

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/CommentRow.tsx
git commit -m "feat(feed): render like row, reply button, replies list in CommentRow"
```

---

## Task 17: Modify `AvatarMenu.tsx` to add Delete account item

**Files:**
- Modify: `src/components/shell/AvatarMenu.tsx`

- [ ] **Step 1: Replace the file body**

Replace `src/components/shell/AvatarMenu.tsx` with:

```tsx
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/hooks/use-auth'
import { logoutCurrentDevice } from '@/lib/auth'
import { DeleteAccountDialog } from './DeleteAccountDialog'

function initials(first?: string | null, last?: string | null): string {
  const a = first?.[0]?.toUpperCase() ?? ''
  const b = last?.[0]?.toUpperCase() ?? ''
  return a + b || '?'
}

export function AvatarMenu() {
  const user = useAuthStore((s) => s.user)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : ''

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="inline-flex items-center gap-2 rounded-full p-0.5 hover:bg-accent"
            disabled={!user}
          >
            <Avatar className="size-9">
              <AvatarImage
                src={user?.avatarUrl ?? undefined}
                alt={fullName || 'User'}
              />
              <AvatarFallback>
                {initials(user?.firstName, user?.lastName)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[260px]">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">
                {fullName || 'Anonymous'}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.email ?? ''}
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {user ? (
            <DropdownMenuItem asChild>
              <Link to="/users/$userId" params={{ userId: user.id }}>
                Profile
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>Profile</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => toast.info('Settings coming soon')}>
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              void logoutCurrentDevice()
            }}
          >
            Logout
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              setDeleteOpen(true)
            }}
            disabled={!user}
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <Trash2 className="mr-2 size-4" />
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
```

The `e.preventDefault()` on the "Delete account" `onSelect` keeps the dialog mounting while the dropdown closes — without it, Radix's automatic close-on-select fires before the dialog can register, and the dialog never opens visibly.

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/AvatarMenu.tsx
git commit -m "feat(shell): add Delete account item to AvatarMenu"
```

---

## Task 18: Manual smoke gate

**Files:** none (validation only).

Run `pnpm dev` (frontend on `http://localhost:3000`) with the backend on `http://localhost:8787`. Walk through every smoke item in the spec's Testing Strategy. A failure on any item means fixing it before declaring the phase done.

**Pre-flight fixtures:**

- Two test users: A (logged-in viewer) and B.
- At least one post with ≥ 1 comment from A and ≥ 1 comment from B.
- At least one top-level comment with ≥ 6 existing replies (so `Show more replies` pagination is exercised at `limit=5`).
- At least one comment with ≥ 6 likers (so the `and N others` footer is exercised at preview cap 5).
- DevTools Network tab open.
- Two tabs logged in as A, both on `/`, for cross-tab smoke.

- [ ] **Step 1: Phase E regression sweep (1 item)**

(1) Cold-load `/` → `/friends` → `/friend-requests` → `/users/<B>`. Sidebars live. Compose text + image post → grid renders. On own post: change visibility (no confirm), delete via owner menu + AlertDialog (cancel). Edit own comment, delete own comment. Avatar upload still works. Profile name edit still works.

- [ ] **Step 2: Phase C regression sweep (1 item)**

(2) Like / unlike a post. Compose a comment under a post — appears in the comments list.

- [ ] **Step 3: Comment likes (4 items)**

(3) Like B's top-level comment → heart fills, count +1, Network: `POST /comments/:id/likes`.
(4) Unlike → outline, count -1, Network: `DELETE /comments/:id/likes`.
(5) Hover the count on a comment with ≥ 1 like → top-5 panel. Like → viewer prepends. Unlike → viewer removed.
(6) Backend down → like → snaps back + `toast.error("Couldn't update like")`.

- [ ] **Step 4: Reply create (4 items)**

(7) Click Reply on B's comment → composer appears below. Type "Hi" + click Reply → reply appears indented under parent. `↳ View N replies` count ticks +1. Network: `POST /comments/:parent/replies`.
(8) Reply via `⌘ / Ctrl + Enter`.
(9) Esc → composer closes, draft discarded. Reopen → empty. Type + Cancel → same.
(10) Backend down → Reply → ghost reply appears then snaps back + toast.error. Composer stays open with draft preserved.

- [ ] **Step 5: Reply list expansion (3 items)**

(11) Click `↳ View N replies` → skeleton rows → real replies indented. Network: `GET /comments/:parent/replies`.
(12) On a parent with ≥ 6 replies, `Show more replies` button appears → click → next page appends.
(13) Collapse + re-expand → instant (no network).

- [ ] **Step 6: Reply optimistic auto-expand (1 item)**

(14) On a collapsed parent with `replyCount = 0`, submit a reply → list auto-expands to show the new reply with `tempId` while the request is in flight.

- [ ] **Step 7: Reply parity (4 items)**

(15) Like a reply → heart fills, count +1.
(16) On A's reply: ellipsis → Edit → textarea swaps in → modify → Save → row re-renders with new content. Refresh confirms.
(17) On A's reply: ellipsis → Delete → AlertDialog → Confirm → reply disappears, parent's `View N replies` ticks down, post comment-counter ticks down.
(18) Hover any reply row → no `Reply` affordance is rendered.

- [ ] **Step 8: Like-preview hover-card (5 items + 1 touch)**

(19) Hover a post's like count → panel opens after ~300ms, top-5 + `and N others` footer when total > 5. Pointer-leave → closes after ~150ms.
(20) Same on a comment's like count.
(21) On a comment with `count === 0`, hovering reveals nothing (count text is not rendered).
(22) Open → close → wait 31s → re-open → Network shows a `GET /…/likes/preview` call.
(23) Like a comment B liked → re-open hover-card → A's avatar prepends.
(24) DevTools "device toolbar" → tap on a like count → opens. Tap outside → closes.

- [ ] **Step 9: Delete-account guard rails (4 items)**

(25) AvatarMenu → "Delete account" → dialog opens with email-input. Delete disabled.
(26) Wrong email → Delete stays disabled, mismatch message under input.
(27) Correct email → Delete enables.
(28) Cancel → dialog closes, no mutation. Re-open → input empty.

- [ ] **Step 10: Delete-account happy (1 item)**

(29) Type email, click Delete → spinner on Delete, Cancel disabled → `DELETE /users/:id` (200) → caches clear → redirect to `/auth/login`. Refresh confirms no auth.

- [ ] **Step 11: Delete-account failure (1 item)**

(30) Backend down → type email + Delete → spinner → ~100ms later, spinner clears, Cancel re-enables, dialog stays open, `toast.error("Couldn't delete account")`. Caches and auth untouched.

- [ ] **Step 12: Cross-tab logout (1 item)**

(31) Open `/` in tab 1 + tab 2 as A. Delete account in tab 2 → tab 2 redirects. Tab 1 also redirects within ~100ms.

- [ ] **Step 13: Dark mode (1 item)**

(32) Toggle dark theme. Verify contrast on: heart fill, comment-like row, reply composer, indented reply rows, `↳ View N replies` button, hover-card content, delete-account dialog, email input, mismatch warning, destructive Delete button.

- [ ] **Step 14: Build hygiene (3 items)**

(33) `pnpm typecheck` → exits 0.
(34) `pnpm lint` → exits 0 with no warnings.
(35) `git status` → clean after the final commit.

- [ ] **Step 15: Final wrap-up commit (only if any in-flight fix-ups were made during smoke)**

If you needed to make any fix-ups during smoke (e.g. tightened a hit area, switched a string), squash them into a single commit:

```bash
git add -A
git commit -m "fix(feed-phase-f): address smoke-gate findings"
```

If no fix-ups were needed, skip this step. The phase is done.

---

## Open Items / Resolution

These were flagged in the spec's "Open Items / Risks" section. Resolve and document inline during smoke:

- **`post.counters.comments` semantics on reply create/delete.** Phase F's reply-create does **not** bump it; Phase E's delete does decrement it for any comment delete. During smoke test #11, observe whether the post counter drifts after creating + deleting replies. If drift exists, either: (a) also bump the post counter on reply create, or (b) skip the decrement on reply delete. Pick whichever matches the server's accounting, document in a follow-up commit message.
- **Generated hook param names.** `useLikeComment`, `useUnlikeComment`, `useCreateCommentReply` may use `comment_id` or `commentId` in their `MutationOptions['variables']` shape. The plan assumes `comment_id` (matching `useCreateComment` from Phase C). If typecheck fails at Task 5, Task 6, or Task 12 with "Property 'X' is missing", read the generated hook's input type and switch the call-site argument name accordingly.
- **Touch hover-card hit area.** If smoke test #24 reveals tap-miss on real-device counts, wrap the count span in `<button type="button" className="rounded p-1 hover:bg-muted">…</button>` to expand the hit area. Confirm desktop hover still works identically.

---

## Self-Review Notes

Reviewed against the spec on completion. Coverage checks:

- Every component in the spec's "Components & Responsibilities" section maps to a Task: HoverCard primitive (T1), feed-cache helpers (T2), useUpdateComment/useDeleteComment enhancements (T3–T4), useToggleCommentLike (T5), useCreateCommentReply (T6), useListCommentReplies (T7), like-preview queries (T8), useDeleteAccount (T9), LikesPreviewHoverCard (T10), CommentLikeButton (T11), CommentReplyButton + CommentReplyComposer (T12), CommentRepliesList (T13), DeleteAccountDialog (T14), PostCardCounters modification (T15), CommentRow modification (T16), AvatarMenu modification (T17).
- All 35 spec smoke items map to the T18 sub-steps (one sub-step bundles related items per area).
- No `// TODO`, no placeholder code, no "fill in the rest".
- Hook signatures referenced in components match what the hooks export: `useToggleCommentLike(postId): { toggle(comment), isPending(commentId) }`, `useCreateCommentReplyMutation(postId, parentCommentId)`, `useListCommentReplies({ postId, parentCommentId }, { enabled })`, `usePostLikesPreview(id, embedded, enabled)`, `useCommentLikesPreview(id, embedded, enabled)`, `useDeleteAccount()`. Query keys are consistent: `['comment-likes-preview', commentId]`, `['post-likes-preview', postId]`, `repliesQueryKey(postId, parentCommentId) = ['comments', postId, 'replies', parentCommentId, 'infinite']`.
- The `CommentRow` ↔ `CommentRepliesList` circular import is acknowledged in Task 13 with an explicit defer of typecheck to Task 16.

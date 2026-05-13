# Feed (Phase C) — Design

**Date:** 2026-05-13
**Status:** Draft (awaiting user review of written spec)
**Phase of:** Three-phase rollout — A: Auth pages (done) → B: Authenticated app shell (done) → **C: Center-column feed + composer + likes + comments (this spec)**

## Purpose

Replace the center-column Phase B placeholders (`ComposerPlaceholder`, `FeedPlaceholder`) with their live counterparts. After Phase C, an authenticated user can:

1. Compose and submit a text post (visibility hardcoded `public`). The new post appears at the top of the feed without a manual refresh.
2. See a cursor-paginated, infinite-scrolling feed of their own + friends' posts.
3. Like / unlike any post; the count and "you liked this" state update optimistically.
4. View the first page of top-level comments for any post and post a new comment; the comment appears immediately under the post.

Stories carousel, sidebars, header, theme toggle, logout, and the `/friend-requests` placeholder are unchanged from Phase B.

## Non-Goals

- **No composer image upload.** `POST /posts/uploads/presign` is not called in Phase C. The composer renders a small image-icon button that fires `toast.info("Image upload coming soon")`. The `CreatePostBody.images` field is sent as `undefined`.
- **No visibility selector in the composer UI.** Every post created via the composer is sent with `visibility: "public"`. The sample doesn't show a picker; we don't invent one.
- **No post detail route** (no `/posts/:postId`). All post interactions happen inline in the feed card. The post `id` is not used to build any URL.
- **No author actions.** Edit post, delete post, change post visibility — none. The API supports them; we ignore for Phase C. No "…" menu on post cards in this phase.
- **No comment author actions.** Edit / delete a comment — none. No "…" menu on comment rows.
- **No nested replies.** `parentCommentId` is ignored when rendering. If the server happens to return replies inline, they are filtered out (`comment.parentCommentId === null` predicate). The "Reply" button from the sample is not rendered.
- **No comment like UI.** Comment rows display the author + content + timeAgo only. No heart/like button on a comment in Phase C.
- **No likes-preview popover.** The post counters row shows raw counts (e.g., "12 Comment"); the `likesPreview` field from `Post` is not rendered (no liker avatars).
- **No "Share" backend.** The Share button stays decorative and fires `toast.info("Share coming soon")` — there is no share endpoint.
- **No sidebar wiring.** `LeftSidebar`, `RightSidebar`, and the static `SAMPLE_*` data in `src/data/sample-shell.ts` are untouched. "Connect" / "Follow" buttons still fire `toast.info` — wiring them is Phase D.
- **No stories changes.** `StoriesCarousel` continues to render `SAMPLE_STORIES`. Stories will not become real in Phase C (no backend endpoint).
- **No optimistic post creation with a temp ID.** Composer waits for the server response (~100–300 ms typical) then prepends. Simpler than the temp-ID dance, no perceptible UX cost. Likes and comments *do* update optimistically.
- **No invalidate-on-settle for likes.** We never refetch the feed after a like toggle. The `counters.likes` may drift by ±1 from server reality between page loads; the trade-off is a snappy UI with no refetch storm. Acceptable; documented in Open Items.
- **No automated tests.** Same manual smoke gate as Phases A and B. (See Open Items / Risks for the trade-off and what would warrant breaking that pattern in Phase D.)

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data fetching | TanStack Query `useInfiniteQuery` wrappers around generated `getFeed` / `listComments` clients | Kubb only generates `useQuery`; infinite queries can't put cursor in the cache key, so we own the wrappers. |
| Feed query key | `['feed', 'infinite'] as const` | Single cache entry for the home feed regardless of cursor. |
| Comments query key | `['comments', postId, 'infinite'] as const` | One cache slot per post. |
| Like mutation | Optimistic; snapshot+patch in `onMutate`, rollback in `onError`, **no settle refetch** | Refetching the whole feed on every like is a refetch storm; ±1 drift is acceptable for a social demo. |
| Comment create | Optimistic with temp client-side ID (`crypto.randomUUID()`); replace with server result in `onSuccess`; rollback in `onError` | Comment latency is more visible than a like (the user is reading their own text appear); justifies the temp-ID complexity. |
| Post create | Server-confirm prepend (not optimistic) | Avoids temp-ID gymnastics; ~100–300 ms blip is fine; counters/viewerState/createdAt all come from server. |
| Infinite scroll trigger | `IntersectionObserver` on a sentinel `<div>` after the last post | Auto-load on scroll; matches sample's UX shape. |
| Comments expansion | Always-visible inline list: first page (limit 3) shown by default, "View N more comments" button paginates | Matches the sample's inline-comments layout. |
| Per-post comments fetching | Lazy: each `<CommentList postId={p.id} />` fires its own `useInfiniteQuery` on mount, only when `post.counters.comments > 0` | Posts with zero comments make zero comment requests. (See Open Items for the request-fan-out risk.) |
| Post ordering in cache | Feed page 0 = newest first (server contract); `setQueryData` prepends new posts via `[newPost, ...pages[0].data]` | Mirrors the server's order; the new post sits at the very top. |
| Like client | `useLikePost` for `liked === false` → `true`, `useUnlikePost` for the reverse | Two separate mutations; the wrapper picks based on current `viewerState`. |
| Comment cache update on create | `setQueryData(['comments', postId, 'infinite'], …)` prepend + `setQueryData(['feed', 'infinite'], …)` bump on the matching post's `counters.comments` | Two cache writes per comment create; both are pure functions over the immutable cache. |
| Error toasts | `sonner` (already in use Phase A/B) — `toast.error()` for mutation failures, `toast.info()` for "coming soon" stubs | Reuses Phase A/B toast singleton. |
| Time formatting | New pure helper `src/lib/format.ts` → `formatTimeAgo(iso: string): string` | No date-fns / dayjs dependency; ~30 LOC suffices. |
| Skeleton style | Plain pulsing grey bars (Tailwind `animate-pulse bg-muted`) | No shadcn `<Skeleton />` add; keeps deps flat. |
| Module placement | `src/features/feed/` for hooks; `src/components/feed/` for presentational components; `src/lib/format.ts` for the date helper | Matches the existing `features/auth/*` + `components/shell/*` split. |
| Sample story stays | `StoriesCarousel` and `SAMPLE_STORIES` remain as-is from Phase B | No stories backend; nothing to wire. |

## Components & Responsibilities

Every module has one clear job, narrow inputs, and can be reasoned about in isolation. Mutations live in `src/features/feed/`; presentational components live in `src/components/feed/`; the only new shared utility is `src/lib/format.ts`.

### `src/lib/format.ts` (new)

**Purpose:** Pure formatting helpers — currently one.
**Exports:**
- `formatTimeAgo(iso: string): string` — returns `"just now"` (<60s), `"N minutes ago"` (<60m), `"N hours ago"` (<24h), `"N days ago"` (<7d), otherwise a short absolute date `"MMM d"` (current year) or `"MMM d, yyyy"` (prior years). Pure; no React imports; safe to call in a render path.

No external deps.

### `src/features/feed/use-feed.ts`

**Purpose:** Cursor-paginated infinite feed query.
**Exports:** `useFeed()` → returns the same shape as TanStack `useInfiniteQueryResult`, plus a memoized `posts: Post[]` flat array (concatenation of `pages.flatMap(p => p.data)`).
**Implementation:**
- `useInfiniteQuery({ queryKey: ['feed', 'infinite'], queryFn: ({ pageParam }) => getFeed({ params: { limit: 20, cursor: pageParam as string | undefined } }), initialPageParam: undefined, getNextPageParam: (lastPage) => lastPage.pagination.hasNext ? lastPage.pagination.nextCursor ?? undefined : undefined })`.
- `import { getFeed } from "@/gen/api/clients/getFeed"` — uses the generated raw client, not the generated hook (the hook is `useQuery`, wrong shape).
- `staleTime` inherits from the project default (5 m).

### `src/features/feed/feed-cache.ts`

**Purpose:** Centralized pure helpers that produce the next-cache-state for the feed. Imported by every feed mutation hook so the cache-shape logic lives in exactly one place.
**Exports:**
- `type FeedPages = InfiniteData<GetFeedQueryResponse, string | undefined>` — the cache type.
- `prependPostToFeed(pages: FeedPages | undefined, post: Post): FeedPages` — returns a new `pages` with `post` prepended to `pages[0].data` (creating an empty page-0 if `pages` is undefined; sets `pagination` to a sensible default).
- `patchPostInFeed(pages: FeedPages | undefined, postId: string, patch: (p: Post) => Post): FeedPages | undefined` — finds the post by id in any page; returns a new `pages` with the patched post; returns `undefined` if `pages` is `undefined` or no post matches.
- `bumpPostCommentCount(pages: FeedPages | undefined, postId: string, delta: number): FeedPages | undefined` — convenience: `patchPostInFeed(pages, postId, p => ({ ...p, counters: { ...p.counters, comments: p.counters.comments + delta } }))`.

All helpers are pure and total — no React, no `queryClient` references inside.

### `src/features/feed/use-create-post.ts`

**Purpose:** Wraps generated `useCreatePost`; on success, prepends the returned `Post` to the feed cache; surfaces an error toast on failure.
**Exports:** `useCreatePostMutation()` → returns the underlying `UseMutationResult`.
**Behavior:**
- `mutationFn: ({ content }) => createPost({ data: { content, visibility: "public" } })`.
- `onSuccess(response)`: `queryClient.setQueryData(['feed', 'infinite'], (pages) => prependPostToFeed(pages, response.data))`.
- `onError`: `toast.error("Couldn't post. Try again.")`. (The mutation's `error` is also returned to the caller so the form can keep the textarea text.)
- No `onSettled` refetch.

### `src/features/feed/use-toggle-post-like.ts`

**Purpose:** A single hook that toggles like state for a given post, picking the right underlying mutation based on the post's current `viewerState.liked`.
**Exports:** `useTogglePostLike()` → returns `{ toggle: (post: Post) => void; isPending: (postId: string) => boolean }`.
**Implementation:**
- Internally uses both `useLikePost` and `useUnlikePost` (generated). The wrapper exposes a single `toggle(post)` method that:
  1. Reads `liked = post.viewerState.liked`.
  2. Calls the inverse mutation (`liked ? unlikePost : likePost`).
- `onMutate(variables)`:
  - `previous = queryClient.getQueryData(['feed', 'infinite'])`.
  - `queryClient.setQueryData(['feed', 'infinite'], (pages) => patchPostInFeed(pages, variables.post_id, (p) => ({ ...p, viewerState: { ...p.viewerState, liked: !p.viewerState.liked }, counters: { ...p.counters, likes: p.counters.likes + (p.viewerState.liked ? -1 : 1) } })))`.
  - return `{ previous }`.
- `onError(_, __, context)`: `queryClient.setQueryData(['feed', 'infinite'], context.previous)` + `toast.error("Couldn't update like")`.
- `onSettled`: nothing. No refetch.
- `isPending(postId)` checks if either mutation is currently pending for that post by inspecting `variables.post_id` on the active mutation.

### `src/features/feed/use-post-comments.ts`

**Purpose:** Cursor-paginated infinite comments query for a single post.
**Exports:** `usePostComments(postId: string, enabled: boolean)` → returns the same shape as `useInfiniteQueryResult`, plus a memoized `comments: Comment[]` flat array filtered to top-level (`parentCommentId === null`).
**Implementation:**
- `useInfiniteQuery({ queryKey: ['comments', postId, 'infinite'], queryFn: ({ pageParam }) => listComments({ post_id: postId, params: { limit: 3, cursor: pageParam as string | undefined } }), initialPageParam: undefined, getNextPageParam: (lastPage) => lastPage.pagination.hasNext ? lastPage.pagination.nextCursor ?? undefined : undefined, enabled })`.
- The first page is small (`limit: 3`) to keep the inline preview tight; subsequent pages (when "View more" is clicked) use the same limit.
- `enabled` is the caller's gate: `<CommentList />` passes `post.counters.comments > 0` so zero-comment posts never fire the query.

### `src/features/feed/use-create-comment.ts`

**Purpose:** Wraps generated `useCreateComment`; on mutate, prepends an optimistic comment to the comments cache and bumps the feed post's comment counter; on success replaces the temp comment with the server result; on error rolls back both caches.
**Exports:** `useCreateCommentMutation(postId: string)` → returns the underlying `UseMutationResult`.
**Implementation:**
- Composes `useCreateComment` (generated) with TanStack Query's `useMutation` options.
- `mutationFn: ({ content }) => createComment({ post_id: postId, data: { content } })`.
- `onMutate({ content })`:
  - Generate `tempId = crypto.randomUUID()`.
  - Build a `tempComment: Comment` with `id: tempId`, `postId`, `parentCommentId: null`, `author` from `useAuthStore.getState().user` (mapped to `CommentAuthor` shape), `content`, `counters: { likes: 0, replies: 0 }` (best-effort defaults), `viewerState: { liked: false }`, `likesPreview: { count: 0, users: [] }`, `isEdited: false`, `createdAt: new Date().toISOString()`, `updatedAt: same`.
  - `previousComments = queryClient.getQueryData(['comments', postId, 'infinite'])`.
  - `previousFeed = queryClient.getQueryData(['feed', 'infinite'])`.
  - Prepend `tempComment` to the comments cache (create an empty page-0 if no comments cache yet).
  - `queryClient.setQueryData(['feed', 'infinite'], (pages) => bumpPostCommentCount(pages, postId, +1))`.
  - return `{ tempId, previousComments, previousFeed }`.
- `onError(_, __, context)`:
  - `queryClient.setQueryData(['comments', postId, 'infinite'], context.previousComments)`.
  - `queryClient.setQueryData(['feed', 'infinite'], context.previousFeed)`.
  - `toast.error("Couldn't post comment")`.
- `onSuccess(response, _, context)`:
  - Replace the comment with `id === context.tempId` in `pages[0].data` with `response.data` (preserving order). If the comment can't be found (e.g., user scrolled and the cache was rewritten), fall back to a no-op — the next fetch will reconcile.
- No `onSettled` refetch.

### `src/components/feed/Composer.tsx` (replaces `ComposerPlaceholder`)

**Purpose:** Top-of-center create-post form.
**Reads:** `user` from `useAuthStore` (for the avatar).
**Local state:** `content: string`, `submitting: boolean` (derived from mutation `isPending`).
**Renders:**
- Card with `<Avatar>` (user's avatar or initials), `<textarea>` placeholder "What's on your mind?", auto-grow up to ~4 rows.
- Bottom row: image-icon button (decorative, `toast.info("Image upload coming soon")`) + `<Button>Post</Button>` on the right, disabled when `content.trim() === ""` or `submitting`.
- On submit: `useCreatePostMutation().mutate({ content: content.trim() }, { onSuccess: () => setContent("") })`. On error the textarea retains its content.
- Max content length 10000 (matches `CreatePostBody.content.maxLength`) — soft-enforced by an HTML `maxLength` attribute, no UI counter.
- No `<form onSubmit>`; submit is a button click + Enter-with-Cmd/Ctrl (Cmd/Ctrl+Enter posts; plain Enter inserts a newline — matches social-app convention).

### `src/components/feed/FeedList.tsx` (replaces `FeedPlaceholder`)

**Purpose:** Renders the infinite-scrolling feed.
**Reads:** `useFeed()`.
**States:**
- **Initial loading** (`isLoading`): 3 skeleton cards (`<FeedSkeletonCard />`).
- **Initial error** (`isError && !data`): centered card "Couldn't load feed. Try again." + `<Button onClick={() => refetch()}>Retry</Button>`.
- **Empty** (`!isLoading && posts.length === 0`): centered card "No posts yet. Be the first to share something!".
- **Populated**: render `posts.map(p => <PostCard key={p.id} post={p} />)`, followed by an `IntersectionObserver` sentinel `<div ref={sentinelRef} aria-hidden="true" />`.
  - While `isFetchingNextPage`: one `<FeedSkeletonCard />` at the bottom.
  - If `error && data` (page-N failed but earlier pages are visible): an inline "Couldn't load more. Retry." button — calls `fetchNextPage()`.
  - If `!hasNextPage && posts.length > 0`: a small muted "You're all caught up" line at the bottom.

**IntersectionObserver wiring:**
- `useEffect` creates the observer on mount; observes `sentinelRef.current`; on `entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching`, calls `fetchNextPage()`. Disconnects on cleanup. Reference is stable across renders.

### `src/components/feed/FeedSkeletonCard.tsx`

**Purpose:** Single skeleton card used during initial loading and between-page loading.
**Markup:** Card with three `<div className="animate-pulse bg-muted h-N rounded">` bars approximating an avatar row + title line + body block. ~25 LOC.

### `src/components/feed/PostCard.tsx`

**Purpose:** A single post card (header + content + counters + reaction row + comments).
**Props:** `{ post: Post }`.
**Layout** (top to bottom):
1. **Header row:** `<Avatar>` + author name (medium) + small muted "{formatTimeAgo(post.createdAt)}". No author actions menu (Non-Goal).
2. **Content block:** `post.content` rendered as a single paragraph; whitespace preserved with `whitespace-pre-line`. No rich text, no link parsing, no @mentions.
3. **Counters row** (only if `counters.likes > 0 || counters.comments > 0`): `<PostCardCounters post={post} />`.
4. `<Separator />`
5. **Reaction row:** `<PostCardReactions post={post} />`.
6. **Comments section:** always rendered; `<CommentComposer postId={post.id} />` + `<CommentList postId={post.id} commentCount={post.counters.comments} />`.

Card container: `rounded-lg bg-card p-6 space-y-4` (matches the look of sidebar cards from Phase B).

### `src/components/feed/PostCardCounters.tsx`

**Purpose:** The "12 Comment · 122 Share" style summary row above the reactions.
**Props:** `{ post: Post }`.
**Renders:** Flex row with `{counters.likes} ❤` (small heart icon, muted) on the left; `{counters.comments} Comment` on the right (plain text, no link). Hidden entirely when both counts are zero (parent gates this).

### `src/components/feed/PostCardReactions.tsx`

**Purpose:** Like / Comment / Share button row matching the sample's three-button reaction strip.
**Props:** `{ post: Post }`.
**Reads:** `useTogglePostLike()`.
**Buttons:**
- **Like** — `<button>` with heart icon. Filled red when `post.viewerState.liked === true`; outline muted when false. `onClick: () => toggle(post)`. Disabled briefly while `isPending(post.id)`.
- **Comment** — Comment-bubble icon + "Comment" label; `onClick` focuses the post's `<CommentComposer />` textarea via a shared `useRef` exposed by `<PostCard />` (one ref per card).
- **Share** — Share-arrow icon + "Share" label; `onClick: () => toast.info("Share coming soon")`. Decorative.

### `src/components/feed/CommentComposer.tsx`

**Purpose:** Per-post inline comment textarea.
**Props:** `{ postId: string; inputRef?: Ref<HTMLTextAreaElement> }`.
**Reads:** `user` from `useAuthStore` for the avatar.
**Local state:** `content: string`.
**Renders:** Inline pill — small `<Avatar>` + auto-growing `<textarea>` (max ~3 rows) + small "Post" icon button. Submit on Cmd/Ctrl+Enter or icon click; calls `useCreateCommentMutation(postId).mutate({ content: content.trim() }, { onSuccess: () => setContent("") })`. On error the text remains.

### `src/components/feed/CommentList.tsx`

**Purpose:** Per-post inline comments list with cursor pagination.
**Props:** `{ postId: string; commentCount: number }`.
**Reads:** `usePostComments(postId, enabled: commentCount > 0)`.
**States:**
- **Disabled** (`commentCount === 0`): renders nothing (other than the composer above it, which is in `PostCard`).
- **Loading first page** (`isLoading`): three small skeleton lines.
- **Error** (`isError && !data`): inline "Couldn't load comments. Retry." button → `refetch()`.
- **Loaded**: `<CommentRow comment={c} />` for each comment in the flat `comments` array; below the last row, a `<button>View N more comments</button>` if `hasNextPage`, where `N = commentCount - comments.length`. Click → `fetchNextPage()` (button label switches to "Loading…" while `isFetchingNextPage`).

### `src/components/feed/CommentRow.tsx`

**Purpose:** A single comment.
**Props:** `{ comment: Comment }`.
**Renders:** Flex row — `<Avatar size="sm">` + bubble (`bg-muted rounded-2xl px-3 py-2`) containing author name (small bold) + content (`whitespace-pre-line`). Below the bubble, a muted line "{formatTimeAgo(comment.createdAt)}". Optimistic temp comments get a `opacity-70` until replaced by the server result.

### Routes

#### `src/routes/_app/index.tsx` (modified)

The center column already lives here from Phase B. Replace its three-child stack with:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { StoriesCarousel } from "@/components/shell/center-stubs/StoriesCarousel"
import { Composer } from "@/components/feed/Composer"
import { FeedList } from "@/components/feed/FeedList"

export const Route = createFileRoute("/_app/")({
  component: HomeFeed,
})

function HomeFeed() {
  return (
    <div className="space-y-6">
      <StoriesCarousel />
      <Composer />
      <FeedList />
    </div>
  )
}
```

No other route additions.

### Deletions

- `src/components/shell/center-stubs/ComposerPlaceholder.tsx` (replaced by `Composer`)
- `src/components/shell/center-stubs/FeedPlaceholder.tsx` (replaced by `FeedList`)

`StoriesCarousel.tsx` stays.

## Data Flow

| Source of truth | Consumers | When it changes |
|---|---|---|
| Feed cache `['feed', 'infinite']` | `FeedList` (read), `useCreatePostMutation` (prepend on success), `useTogglePostLike` (optimistic patch + rollback), `useCreateCommentMutation` (counter bump + rollback) | Cold load, `fetchNextPage()`, post create success, like toggle (optimistic), comment create (optimistic) |
| Comments cache `['comments', postId, 'infinite']` | `CommentList` (read), `useCreateCommentMutation` (prepend + rollback) | First mount of a `CommentList` with `commentCount > 0`, `fetchNextPage()`, comment create (optimistic) |
| `useAuthStore.user` | `Composer` (avatar), `CommentComposer` (avatar), `useCreateCommentMutation` (optimistic comment author) | Login, logout (Phase A behavior) |
| `useFeed().posts` | `FeedList` render output | Cache changes (above) |
| `usePostComments(postId).comments` | `CommentList` render output for that `postId` | Cache changes for that post's comments |
| Mutation state (`isPending` for like/comment/post) | Buttons in `Composer`, `PostCardReactions`, `CommentComposer` | Mutation start / settle |

**No new global stores.** No Zustand additions. All server state goes through the QueryClient set up in Phase A; all client state (theme, auth) is unchanged from Phase B.

## Error Handling

| Surface | Strategy |
|---|---|
| Feed initial fetch fails | Centered error card with "Couldn't load feed." + `Retry` button (calls `refetch()`). |
| Feed next-page fetch fails | Inline "Couldn't load more. Retry." button at the bottom of the list; calls `fetchNextPage()`. Existing pages remain visible. |
| Feed empty | Centered card "No posts yet. Be the first to share something!" — composer above still works. |
| Comment list fetch fails | Inline "Couldn't load comments. Retry." button within the post card; clicking calls the comments query's `refetch()`. |
| Post create fails | Composer keeps its text (user can retry); `toast.error("Couldn't post. Try again.")`. No optimistic prepend to roll back (we never prepended). |
| Like toggle fails | Optimistic patch rolled back via `onMutate`'s snapshot; `toast.error("Couldn't update like")`. |
| Comment create fails | Optimistic prepend rolled back from comments cache + comment-counter bump rolled back from feed cache; composer keeps its text; `toast.error("Couldn't post comment")`. |
| 401 mid-session | Caught by the existing `api-client.ts` `afterResponse` hook (Phase A). It either silently refreshes or clears auth + redirects to `/auth/login`. No new handling in Phase C. |
| Network drop (offline) | `ky` `beforeError` toasts on network errors (Phase A behavior). Mutations show the standard error path above. |

No new error boundaries needed. `FeedList`, `CommentList`, and the mutations all degrade in place.

## Testing Strategy

No automated tests in Phase C. Same approach as Phases A and B: manual smoke gate.

**Pre-req:**
- A known test account that can log in (Phase A flow works).
- Backend running at `http://localhost:8787` and seeded with at least one other user that has posts (so the feed isn't empty on first load).
- `pnpm dev` running.

**Manual smoke gate** (all must pass before declaring Phase C complete):

1. `pnpm typecheck && pnpm lint` — both 0 errors.
2. `pnpm dev` — no console errors; no missing-asset 404s; React Query Devtools mounted.
3. **Cold-boot logged in** → lands on `/`, three-column shell renders (Phase B regression check), center column shows: stories (sample), composer (real), feed (real).
4. **Empty feed path** — sign in as a brand-new user with no friends and no posts. Center column shows the "No posts yet…" empty state under the composer.
5. **Compose a post** — type "Hello from Phase C 🎉" into the composer, click Post. Within ~1s the post appears as the top item in the feed, with the current user's name, avatar, and a "just now" timestamp. Textarea clears. No console errors.
6. **Compose with Cmd/Ctrl+Enter** — type, press Cmd/Ctrl+Enter, post is created. Plain Enter inserts a newline (doesn't submit).
7. **Compose validation** — empty whitespace-only text: Post button disabled. Pasting >10000 characters: textarea caps at 10000 (browser-enforced via `maxLength`).
8. **Compose failure** — kill the backend, click Post → text remains in textarea, error toast appears. Restart backend, click Post again, succeeds.
9. **Like a post** — click the heart on any post. Icon turns filled-red instantly; counter increments; no spinner blip. Click again, instantly reverts to outline + decremented counter. Refresh the page: server state matches.
10. **Like failure** — kill backend, click heart → it flips instantly, then snaps back ~100ms later, error toast appears. Restart backend, retry, succeeds.
11. **Comment-fetch lazy gate** — open Network tab. A feed with N posts where M of them have ≥1 comment: exactly M `listComments` requests fire on first paint, none for the (N − M) zero-comment posts. (Posts that scroll into view after pagination should fire on render too if they have comments.)
12. **Post a comment** — type into a post's comment composer, press Cmd/Ctrl+Enter. The comment appears inline immediately (optimistic, with slight opacity dim). After the request settles (~300ms) the comment becomes fully opaque (replaced by server result). Post's "N Comment" counter ticks up. No console errors.
13. **Comment pagination** — find a post with >3 comments. List shows the first 3 with a "View N more comments" button. Click it → next page appends below the existing ones; button label updates with new remainder, or disappears when none remain.
14. **Comment failure** — kill backend, post a comment → it appears, then disappears ~100ms later, error toast appears. Composer keeps its text. Restart backend, retry, succeeds.
15. **Infinite scroll** — feed should auto-load the next page when scrolling near the bottom. A `FeedSkeletonCard` appears briefly. Subsequent pages append without duplicating earlier posts. When the server returns `hasNext: false`, a muted "You're all caught up" line replaces the sentinel.
16. **Feed initial fetch error** — start frontend with backend offline → centered "Couldn't load feed" error card + retry button. Bring backend up, click retry, feed loads.
17. **Visual parity at 1440px** — open `sample_screens/feed.html` in a second tab; compare the center column post card layout (header row, content, counters row, reactions row, comments section). Materially indistinguishable. Tweak Tailwind classes per-component until close enough. Common tweaks: card spacing (~16–24px between sections), heart-icon color (red `#ef4444` when liked), comment bubble background (use `bg-muted`).
18. **Dark mode** — toggle theme via the floating button. Composer, post card, comment bubbles, skeleton bars, error states all render legibly in dark mode (Phase B palette applied; no white-on-white surprises).
19. **Logout regression** — open avatar menu, click Logout → redirects to `/auth/login`. Re-login → lands back on `/`, feed reloads. (No stale cache leakage across users.)
20. **Multi-tab regression** — open two tabs at `/`. Post in tab 1 → tab 2 does **not** auto-update (we don't subscribe to a feed channel). Refresh tab 2 → new post is present. Accept this as intentional (no real-time in Phase C).

Final commit (if any visual tweaks were needed during step 17): `fix(feed): visual tweaks from smoke pass`.

## Build / Execution Sequence

Order matters: later steps import from earlier ones. Each step ends in a small, reviewable commit.

1. **Time-ago helper.** Create `src/lib/format.ts` with `formatTimeAgo`. Typecheck. Commit `feat(util): formatTimeAgo helper`.
2. **Feed-cache pure helpers.** Create `src/features/feed/feed-cache.ts` (`FeedPages`, `prependPostToFeed`, `patchPostInFeed`, `bumpPostCommentCount`). Typecheck. Commit `feat(feed): cache mutation helpers`.
3. **Feed query hook.** Create `src/features/feed/use-feed.ts` (`useFeed()` infinite query wrapper). Typecheck. Commit `feat(feed): useFeed infinite query`.
4. **Comments query hook.** Create `src/features/feed/use-post-comments.ts` (`usePostComments(postId, enabled)`). Typecheck. Commit `feat(feed): usePostComments infinite query`.
5. **Mutation hooks.** Create `src/features/feed/use-create-post.ts`, `src/features/feed/use-toggle-post-like.ts`, `src/features/feed/use-create-comment.ts`. Typecheck. Commit `feat(feed): post/like/comment mutations with optimistic cache patches`.
6. **Composer component.** Create `src/components/feed/Composer.tsx`. Typecheck. Commit `feat(feed): live composer`.
7. **Skeleton + Comment row + Comment composer.** Create `src/components/feed/FeedSkeletonCard.tsx`, `src/components/feed/CommentRow.tsx`, `src/components/feed/CommentComposer.tsx`. Typecheck. Commit `feat(feed): comment row, comment composer, skeleton card`.
8. **Comment list.** Create `src/components/feed/CommentList.tsx`. Typecheck. Commit `feat(feed): comment list with pagination`.
9. **Post card sub-components.** Create `src/components/feed/PostCardCounters.tsx`, `src/components/feed/PostCardReactions.tsx`. Typecheck. Commit `feat(feed): post card counters and reactions row`.
10. **Post card.** Create `src/components/feed/PostCard.tsx`. Typecheck. Commit `feat(feed): post card composing all sub-components`.
11. **Feed list.** Create `src/components/feed/FeedList.tsx` with all states (loading / empty / error / populated / next-page) and the IntersectionObserver sentinel. Typecheck. Commit `feat(feed): infinite feed list with all states`.
12. **Wire route.** Modify `src/routes/_app/index.tsx` to import `Composer` and `FeedList` instead of `ComposerPlaceholder` / `FeedPlaceholder`. Delete `src/components/shell/center-stubs/ComposerPlaceholder.tsx` and `src/components/shell/center-stubs/FeedPlaceholder.tsx`. Typecheck + lint. Commit `feat(routes): wire live composer and feed; remove Phase B placeholders`.
13. **Smoke gate** (§Testing Strategy). Apply visual-tweak commits as needed.

## Open Items / Risks

- **Comments fan-out on first paint.** With "first 3 comments inline by default" and lazy per-post fetching, ~5–10 simultaneous `listComments` requests fire when the feed first paints (one per visible post that has ≥1 comment). Acceptable for this assessment / dev backend. A real production deployment would either (a) embed N preview comments in the `GET /feed` response, or (b) collapse comments under a click-to-expand toggle. The 5-minute `staleTime` already keeps re-renders quiet; the issue is purely first-paint load. **Mitigation if it bites:** swap the inline list for a click-to-expand "Comment" button. The change is local to `<CommentList />` and `<PostCardReactions />`.
- **Like-counter drift.** We intentionally skip `onSettled` refetch after a like toggle. Counters can drift by ±1 from server reality when concurrent likers race. Refresh of the page corrects it. Acceptable.
- **Optimistic comment author is a partial `Comment`.** The optimistic `tempComment` synthesizes a `Comment` shape from the current user. If the API's `CommentAuthor` schema expects fields we don't have on `useAuthStore.user` (e.g., the schema requires an avatar URL that's `null`), the optimistic render may differ from the server's response. Risk is cosmetic (~100 ms of slightly different rendering before replacement). The smoke gate (step 12) covers this — look for a visible flicker between optimistic and real render. If it's distracting, drop optimism for comments and fall back to server-confirm-then-prepend (same pattern as posts).
- **`Comment.parentCommentId` filtering.** We filter to top-level comments only. If the server returns paginated comments and some pages happen to contain only replies, those pages will appear "empty" to the user even though `hasNext` is true. Unlikely if the backend orders by `createdAt` over all comments, but worth checking during smoke step 13.
- **`crypto.randomUUID()` in older browsers.** Available in all evergreen browsers (Chrome 92+, Firefox 95+, Safari 15.4+) and required by the optimistic comment. Project already targets evergreen; no polyfill needed.
- **No automated tests for cache helpers.** `feed-cache.ts` is the kind of pure-function module that's straightforward to unit-test (~30 minutes of vitest work for ~95% coverage). Phase C opts out to stay consistent with Phases A/B. If a regression bites during Phase D, retrofit unit tests for `feed-cache.ts` as the first step — `pnpm test` is already wired (jsdom).
- **`StoriesCarousel` sticks around.** Sample renders stories above the composer, but there's no stories backend in this assessment. The Phase B sample carousel remains; if a reviewer expects stories to be functional, the Phase B `toast.info` on the carousel arrow makes the deferred state explicit. No change needed in Phase C.
- **Feed staleness across login switches.** Verified Phase A's `logoutCurrentDevice` already calls `queryClient.clear()` (`src/lib/auth.ts:71`), so logging out → logging in as a different user cannot leak Cache User A's feed. Smoke step 19 sanity-checks this still works after Phase C lands.
- **Composer Cmd/Ctrl+Enter on macOS vs Windows/Linux.** Standard pattern: bind both `metaKey` (macOS) and `ctrlKey` (others) → either submits. Tested in step 6.

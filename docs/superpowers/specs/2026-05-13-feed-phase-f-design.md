# Feed (Phase F) — Comment Engagement, Like Previews & Account Deletion — Design

**Date:** 2026-05-13
**Status:** Draft (awaiting user review of written spec)
**Phase of:** Six-phase rollout — A: Auth (done) → B: App shell (done) → C: Feed + composer + likes + comments (done) → D: Sidebar + friends + profiles (done) → E: Image / avatar upload + post & comment ownership (done) → **F: Comment likes, comment replies, like-preview hover-cards, account deletion (this spec)**

## Purpose

Close the loop on every endpoint that Phase E explicitly deferred: comment engagement (likes + replies), like-preview hover-cards on posts and comments, and account deletion via the existing AvatarMenu. After Phase F, an authenticated user can:

1. Like or unlike any comment (top-level or reply) via a heart icon under the comment row; the count updates optimistically and is mirrored across every mounted instance of that comment.
2. Reply to any top-level comment via an inline composer that opens beneath the parent row. Replies render indented under their parent, are paginated and lazy-loaded behind a `↳ View N replies` expander, and inherit the full set of comment affordances: like, edit (if owner), delete (if owner).
3. Hover (or tap on touch devices) the like-count of any post or comment to reveal a small panel listing the top-5 most-recent likers plus a "+N others" footer when the total exceeds the preview window. The panel uses each post / comment's embedded `likesPreview` as instant initial data and refreshes in the background.
4. Delete their own account via a new "Delete account" item in the existing `AvatarMenu` dropdown. The destructive action is gated by a type-to-confirm `AlertDialog` — the user must type their own email exactly before the **Delete** button enables. On success, all caches are cleared, auth is dropped, the existing `BroadcastChannel('auth')` notifies peer tabs, and the router redirects to `/auth/login`.

Phase A / B / C / D / E surfaces are otherwise untouched: auth, app shell, feed pagination, post composer, image upload, post & comment ownership, friend mutations, profile read view, sidebar cards remain bit-for-bit identical from a Phase E-finished baseline. Two existing Phase E hooks (`useUpdateCommentMutation`, `useDeleteCommentMutation`) receive a small enhancement so that comment edit / delete continues to work when the target comment is a reply (i.e. lives in a reply cache rather than the top-level comments cache).

## Non-Goals

- **No `/settings` route.** Delete-account is the only setting Phase F adds. Building a route shell for a single item is over-build. A future settings page (notifications, change password, blocked users, etc.) is the natural home if more settings materialize — Phase G or later.
- **No reply-to-reply (nested > 1 level).** The API model is one level deep (`Comment.parentCommentId: string | null`, with no `parentReplyId` or recursive nesting). Reply rows intentionally do **not** render a `Reply` button.
- **No mention parsing (`@user` linkification, autocomplete, tokenization).** Reply composer is plain text. The composer does **not** auto-prefix `@author` — that was rejected explicitly during brainstorming (would conflict with future mention parsing and the indentation already signals who's being replied to).
- **No "people who liked this" full-list modal.** The hover-card with top-5 + "+N others" is the only surface. Clicking "+N others" is **not** a link. If a full like-list is needed later, that's a Phase G addition.
- **No like animations.** Heart-toggle on click does not pulse, scale, color-burst, particle-burst, or otherwise animate. The instant filled-state flip is the only feedback.
- **No notifications on like / reply.** No bell icon, no toast on incoming activity. The notifications endpoint does not exist; a future phase wires it.
- **No undo for account deletion.** The type-to-confirm is the only safety. A successful delete is final.
- **No password re-entry / grace period for account deletion.** Type-email is the only gate. We do not require re-entering the password, do not send a confirmation email, do not allow a 7-day cancel window.
- **No automated tests.** Manual smoke gate is the validation, same as Phases A / B / C / D / E. Pure helpers and the cache walk logic are the unit-test surface to revisit if regressions bite.
- **No retroactive polling, websocket, or focus-refetch.** `staleTime: 30s` + `refetchOnMount: 'always'` on the hover-card queries is the only refresh path. We do not poll, do not refetch on `window.focus`, do not subscribe to a websocket.
- **No comment-counter fan-out across post-list caches when a reply is created.** Replies bump only the *comment's* `counters.replies`. The *post's* `counters.comments` is left alone for replies; it continues to be decremented on any comment delete (Phase E behavior) to stay consistent with the server's counting rules. If divergence surfaces, smoke test #11 documents the fix.
- **No new components for delete-account confirmation.** `DeleteAccountDialog` reuses the existing `AlertDialog` primitive (added in Phase E) plus an `<Input>` — no new shadcn dependencies for this surface.
- **No background indicator** for "fetching latest likers" while the hover-card is open. The panel renders instantly from `initialData`; the background refetch silently replaces the data when it returns. No spinner.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Folder layout | New mutation / query hooks under `src/features/feed/` for comment-like, comment-reply, and like-preview. New `src/features/auth/use-delete-account.ts`. Presentational components under `src/components/feed/` and one new `DeleteAccountDialog` under `src/components/shell/`. | Matches the Phase C / D / E split — feature-folder per domain, components per render-tree. |
| Reply rendering depth | One level (FB-style). Reply rows do not render a `Reply` button. | The `Comment` shape exposes only `parentCommentId`; the API does not support nested replies. UI must not promise something the model can't store. |
| Reply expander | Collapsed by default — single line `↳ View N replies` button that mounts an infinite query when clicked. | Matches the API shape (separate paginated endpoint per parent), keeps the comment list compact, and avoids dominating a post when a single hot comment has many replies. |
| Reply composer placement | Inline beneath the parent row, above the replies list. No auto-prefixed `@author`. | Matches FB's pattern; indentation alone signals the parent. Plain text avoids tokenization conflict with future mention parsing. |
| Reply parity | Full parity — replies use the same `CommentRow` component with `isReply` flag. Replies support like / edit (owner) / delete (owner). No nested reply button. | One component, one set of capabilities. Easier to reason about than a tiered "rich top-level / minimal reply" split. |
| Reply cache key | `['comments', postId, 'replies', commentId, 'infinite']` (sibling under each parent). Same `CommentPages` envelope as the top-level comments cache. | Mirrors the API shape; the existing `patchCommentInList` / `removeCommentFromList` helpers from Phase E apply unchanged. |
| Comment-like cache strategy | Reuse the existing `patchCommentInList` helper from Phase E. New pure helper `patchCommentLike(c, liked)` returns a new `Comment` with `viewerState.liked` flipped, `counters.likes ± 1`, and the viewer prepended/removed from `likesPreview.preview` (with `count` adjusted, dedup by id, cap top-5). | Mirrors `patchPostLike` from Phase C. The comment list patch walks both the top-level and reply caches so a like applied to a reply patches the right cache. |
| Like-preview interaction | shadcn `HoverCard` (added via `pnpm dlx shadcn@latest add hover-card`). Wraps the like-count text on posts and comments. Radix degrades to tap-on-touch automatically. | Adds one tiny primitive; the established FB / Twitter mental model is hover-to-reveal. Click-only via `Popover` was the smaller-surface alternative but the brainstorm chose hover. |
| Like-preview data source | `useQuery` with `initialData` populated from each post / comment's embedded `likesPreview` field. `staleTime: 30s`, `refetchOnMount: 'always'`, `enabled: open`. | Instant panel from embedded data; background refresh reconciles ordering rules we can't perfectly replicate client-side. Network only when the user actually looks. |
| Like-preview optimistic patch | On like, prepend the viewer to `preview` (dedup by id), bump `count`, cap preview at 5. On unlike, filter the viewer, decrement `count` (floor 0). Same helper applied to comment and post preview caches. | Lets the hover-card update without a refetch when the user just liked. Reordering rules are server-of-record; the next refetch reconciles. |
| Account-delete placement | New `DropdownMenuItem` "Delete account" inside the existing `AvatarMenu`. Click opens a local `DeleteAccountDialog`. | Smallest surface that fulfills the requirement — Phase E's non-goals said "danger zone in settings," but a settings page for one item is over-build. The menu already groups identity actions (Profile, Log out). |
| Account-delete confirmation | `AlertDialog` body contains a type-to-confirm `<Input>` requiring the user to enter their email exactly. **Delete** button is disabled until match. Cancel disabled while pending. | Industry-standard safety pattern for irreversible account-level destruction. A simple AlertDialog has been retired by most apps because misclicks are catastrophic. |
| Account-delete post-success | `queryClient.clear()` → `clearAuth()` → `BroadcastChannel('auth').postMessage({ type: 'logout' })` → `navigate({ to: '/auth/login' })`. | Reuses every Phase A primitive for cross-tab logout. No new auth code in `__root.tsx`. The redirect itself is the success signal — no toast. |
| Comment edit / delete cross-cache | Phase E's `useUpdateCommentMutation` and `useDeleteCommentMutation` walk both the top-level comments cache and every reply cache for the post (via a predicate over `['comments', postId, 'replies', *, 'infinite']`). For delete, when the target is a reply (`parentCommentId !== null`), additionally `patchCommentInList(commentsKey, parentId, c => bumpCommentReplyCount(c, -1))`. | The minimum touch-up to Phase E that lets replies inherit the full Phase E owner-menu behavior without forking the hooks. |
| Toasts | `toast.error(...)` on every mutation failure (like, unlike, reply create, comment edit/delete-on-reply-path, delete-account). **No success toasts** (consistent with Phases C / D / E). For hover-card refetch errors: silent (read-only enrichment). | Matches existing pattern. |
| Path-alias style | `.ts` extensions on `@/gen/api/*` imports; bare on feature modules. | Match each directory's existing style. |

## Components & Responsibilities

Each module has one job, narrow inputs, and is reasoned about in isolation.

### Pure helper additions — `src/features/feed/feed-cache.ts`

| Helper | Signature | Caller |
|---|---|---|
| `patchCommentLike` | `(comment: Comment, liked: boolean, viewer: ReactionUserSummary) => Comment` | `useLikeCommentMutation`, `useUnlikeCommentMutation` |
| `bumpCommentReplyCount` | `(comment: Comment, delta: 1 \| -1) => Comment` | `useCreateCommentReplyMutation`, enhanced `useDeleteCommentMutation` |
| `patchLikesPreviewAddViewer` | `(preview: LikesPreview, viewer: ReactionUserSummary) => LikesPreview` | comment-like + post-like preview-cache patches |
| `patchLikesPreviewRemoveViewer` | `(preview: LikesPreview, viewerId: string) => LikesPreview` | comment-unlike + post-unlike preview-cache patches |
| `prependReplyToPages` | `<T extends ListCommentRepliesQueryResponse>(pages: CommentPages \| undefined, reply: Comment) => CommentPages \| undefined` | `useCreateCommentReplyMutation` |
| `findCommentInAllCaches` | `(queryClient: QueryClient, postId: string, commentId: string) => { key: QueryKey; comment: Comment } \| null` | enhanced `useUpdateCommentMutation` / `useDeleteCommentMutation` |
| `patchCommentInAllCaches` | `(queryClient: QueryClient, postId: string, commentId: string, patch: (c: Comment) => Comment) => Array<readonly [QueryKey, CommentPages \| undefined]>` (returns snapshots for rollback) | enhanced `useUpdateCommentMutation` / `useLikeCommentMutation` / `useUnlikeCommentMutation` |
| `removeCommentFromAllCaches` | `(queryClient: QueryClient, postId: string, commentId: string) => Array<readonly [QueryKey, CommentPages \| undefined]>` | enhanced `useDeleteCommentMutation` |

`patchCommentInAllCaches` / `removeCommentFromAllCaches` walk the top-level cache first, then iterate every reply cache for the post via `queryClient.getQueriesData({ predicate })`, patching wherever the comment lives. They return a list of `[key, snapshot]` tuples so `onError` can restore exactly what was patched.

### Query / mutation hooks

**Feed (`src/features/feed/`):**

| Hook | Behavior |
|---|---|
| `useLikeCommentMutation(postId)` | Wraps generated `useLikeComment`. `onMutate`: cancel top-level cache + every reply cache for the post + `['comment-likes-preview', commentId]`; snapshot all three; `patchCommentInAllCaches(qc, postId, id, c => patchCommentLike(c, true, viewerSummary))`; `setQueryData(['comment-likes-preview', commentId], prev => prev ? { data: patchLikesPreviewAddViewer(prev.data, viewerSummary) } : prev)`; return `{ commentSnapshots, previewSnapshot }`. `onError`: restore both + `toast.error("Couldn't like comment")`. **No `onSettled` refetch.** |
| `useUnlikeCommentMutation(postId)` | Mirror — `patchCommentLike(c, false, viewerSummary)` + `patchLikesPreviewRemoveViewer(prev.data, viewerId)`. |
| `useCreateCommentReplyMutation(postId, parentCommentId)` | Wraps generated `useCreateCommentReply`. `onMutate`: cancel `['comments', postId, 'replies', parentCommentId, 'infinite']` + `['comments', postId, 'infinite']`; snapshot both; build optimistic `Comment` with `id: tempId`, `parentCommentId`, viewer as `author`, zero counters, viewer-state `liked: false`, empty `likesPreview`, `isEdited: false`, `createdAt/updatedAt: nowIso`; `prependReplyToPages` into the reply cache; `patchCommentInList(commentsKey, parentCommentId, c => bumpCommentReplyCount(c, +1))`; return `{ replySnapshot, parentSnapshot, tempId }`. `onSuccess`: swap `tempId` → server id via `patchCommentInList(replyKey, tempId, () => serverReply)`. `onError`: restore both + `toast.error("Couldn't post reply")`. |
| `useListCommentRepliesInfiniteQuery({ postId, parentCommentId }, { enabled })` | Wraps generated `useListCommentRepliesInfinite` (or our own `useInfiniteQuery` over the client). `queryKey: ['comments', postId, 'replies', parentCommentId, 'infinite']`. `initialPageParam: undefined`, `getNextPageParam: lastPage => lastPage.pagination.hasNext ? lastPage.pagination.nextCursor : undefined`. `staleTime: 5min` (matches global), `enabled` is the `expanded` flag from `<CommentRepliesList>`. |
| `usePostLikesPreviewQuery(postId, embedded, enabled)` | `useQuery({ queryKey: ['post-likes-preview', postId], queryFn: () => getPostLikesPreview({ post_id: postId }), initialData: { data: embedded }, staleTime: 30_000, refetchOnMount: 'always', enabled })`. |
| `useCommentLikesPreviewQuery(commentId, embedded, enabled)` | Same shape against `getCommentLikesPreview`. |

**Auth (`src/features/auth/`):**

| Hook | Behavior |
|---|---|
| `useDeleteAccount()` | Wraps generated `useDeleteUser`. `onSuccess`: `queryClient.clear()`; `clearAuth()`; `new BroadcastChannel('auth').postMessage({ type: 'logout' })`; `router.navigate({ to: '/auth/login' })`. `onError`: `toast.error("Couldn't delete account")`. Caller (`DeleteAccountDialog`) reads `isPending` to drive spinner + disabled Cancel. |

### Phase E hook enhancements (in `src/features/feed/`)

| Hook | Enhancement |
|---|---|
| `useUpdateCommentMutation(postId)` | Patch logic now uses `patchCommentInAllCaches(qc, postId, id, c => ({ ...c, content, isEdited: true, updatedAt: nowIso }))`. `onError`: restore each `[key, snapshot]` tuple. No behavior change for top-level comments. |
| `useDeleteCommentMutation(postId)` | Find logic uses `findCommentInAllCaches` to determine whether the target is top-level or a reply. Remove logic uses `removeCommentFromAllCaches`. When `comment.parentCommentId !== null`, additionally `patchCommentInList(commentsKey, parentCommentId, c => bumpCommentReplyCount(c, -1))` to tick the parent's reply counter. The existing post-counter decrement (`patchAllPostListCaches(postId, p => ({ ...p, counters: { ...p.counters, comments: p.counters.comments - 1 } }))`) is preserved unchanged. |

### Components — `src/components/feed/`

| Component | Props | Renders |
|---|---|---|
| `CommentLikeButton` | `{ comment, postId }` | Small flex row: heart icon button (filled when `comment.viewerState.liked`, outline otherwise) + count text. The count text is wrapped in `<LikesPreviewHoverCard kind="comment" id={comment.id} embedded={comment.likesPreview}>` so hovering it opens the panel. When `count === 0`, the count text is not rendered and the hover-card wrapper is omitted (heart button stays). Click on heart fires `useLikeCommentMutation` or `useUnlikeCommentMutation` depending on current state. |
| `CommentReplyButton` | `{ onClick, disabled }` | `Reply` text button (`Button` `ghost` size `sm`). Visible only on top-level comment rows (the parent decides). |
| `CommentReplyComposer` | `{ postId, parentCommentId, onCancel, onSuccess }` | Mirrors `CommentComposer`: textarea + Reply / Cancel buttons. Reply enabled when `trimmed.length > 0 && !mutation.isPending`. `⌘ / Ctrl + Enter` submits; `Esc` triggers `onCancel`. On `mutation.onSuccess`: calls `props.onSuccess()` (parent clears `replyOpen`). On error: composer stays open with the draft preserved. |
| `CommentRepliesList` | `{ postId, parentCommentId, replyCount }` | When collapsed, renders `↳ View {replyCount} replies` button (only if `replyCount > 0`). Click → `setExpanded(true)`. When expanded, mounts `useListCommentRepliesInfiniteQuery({ postId, parentCommentId }, { enabled: true })` and renders `<CommentRow isReply postId={postId} comment={r} />` for every flattened reply. While loading the first page: 1–3 skeleton rows. If `pagination.hasNext`: a `Show more replies` button at the bottom. Auto-expands when the parent's reply cache contains an optimistic reply with `tempId`. |
| `LikesPreviewHoverCard` | `{ kind: 'post' \| 'comment', id, embedded, children }` | If `embedded.count === 0`: renders `children` directly (no hover-card). Otherwise wraps `children` in `<HoverCard openDelay={300} closeDelay={150}>` with `<HoverCardTrigger asChild>{children}</HoverCardTrigger>`. The trigger's `onOpenChange` toggles `enabled` so the query only runs while the panel is open. `HoverCardContent`: a 240px-wide stack of up-to-5 avatar + name rows (uses `<Avatar>` + inline `[firstName, lastName].filter(Boolean).join(' ')` — same pattern as existing `AvatarMenu` / `ProfileHeader`; no shared helper); if `count > preview.length`, a small footer `and {count - preview.length} others`. While the background query is fetching for the first time and `embedded.preview.length === 0`, render 3 placeholder skeleton rows (rare — only when an optimistic like on a previously-zero comment opens the panel mid-fetch). |

### Components — `src/components/shell/`

| Component | Props | Renders |
|---|---|---|
| `DeleteAccountDialog` | `{ open, onOpenChange }` | `AlertDialog`. Header title "Delete your account?". Description: "This permanently removes your account, posts, comments, and avatar. This can't be undone." Body: `<label>Type your email to confirm: <strong>{user.email}</strong></label> <Input value={typed} onChange={...} autoComplete="off" />`. Mismatch message under the input when `typed.length > 0 && typed.trim() !== user.email`. Footer: Cancel + Delete. Cancel calls `onOpenChange(false)`; Delete fires `useDeleteAccount().mutate({ id: user.id })`. Delete is `disabled` when `typed.trim() !== user.email \|\| mutation.isPending`. Cancel is `disabled` when `mutation.isPending`. The dialog is uncontrolled-typing — typed state is local and resets when the dialog closes. |

### Component modifications

| File | Change |
|---|---|
| `src/components/feed/CommentRow.tsx` | Accept new optional prop `isReply?: boolean` (default `false`). Apply `pl-10` indent class when `isReply`. Below the existing content / edit-mode block, render an action row: `<CommentLikeButton comment={comment} postId={postId} />` and (when `!isReply`) `<CommentReplyButton onClick={() => setReplyOpen(true)} disabled={replyOpen} />`. Below the action row, when `!isReply && replyOpen`, render `<CommentReplyComposer postId={postId} parentCommentId={comment.id} onCancel={() => setReplyOpen(false)} onSuccess={() => setReplyOpen(false)} />`. Below that, when `!isReply`, render `<CommentRepliesList postId={postId} parentCommentId={comment.id} replyCount={comment.counters.replies} />`. Owner menu (Phase E) is unchanged and applies to both top-level and reply rows. |
| `src/components/feed/CommentList.tsx` | No change. Already passes `postId` to each row. |
| `src/components/feed/PostCardCounters.tsx` | Wrap the like-count `<span>{likes}</span>` (and its heart icon) in `<LikesPreviewHoverCard kind="post" id={post.id} embedded={post.likesPreview}>...</LikesPreviewHoverCard>`. The hover-card wrapper component itself decides to render nothing when `count === 0`, so the existing `if (likes === 0 && comments === 0) return null` short-circuit stays intact. |
| `src/components/shell/AvatarMenu.tsx` | Below the existing `Logout` item, add a new `<DropdownMenuSeparator />` and a destructive-colored `<DropdownMenuItem onSelect={() => setDeleteOpen(true)}>` "Delete account" (with `Trash2` icon, `text-destructive` styling). Locally manage `deleteOpen` state via `useState<boolean>(false)` and render `<DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />` outside the `DropdownMenuContent` (so the dialog persists after the menu closes — `DropdownMenuItem`'s default `onSelect` closes the menu, which is desired). The existing placeholder `Settings` item (toasts "Settings coming soon") is left untouched. |
| `src/features/feed/feed-cache.ts` | Append `patchCommentLike`, `bumpCommentReplyCount`, `patchLikesPreviewAddViewer`, `patchLikesPreviewRemoveViewer`, `prependReplyToPages`, `findCommentInAllCaches`, `patchCommentInAllCaches`, `removeCommentFromAllCaches`. No changes to existing exports. |
| `src/features/feed/use-update-comment.ts` (Phase E) | Replace direct top-level patch with `patchCommentInAllCaches` and restore tuple-based snapshots. No external API change. |
| `src/features/feed/use-delete-comment.ts` (Phase E) | Replace direct top-level remove with `findCommentInAllCaches` + `removeCommentFromAllCaches`. When the found comment has `parentCommentId !== null`, also bump the parent's reply counter via `patchCommentInList`. The post-comment counter decrement stays unchanged. |

### `HoverCard` primitive

The single shadcn primitive added in Phase F:

```bash
pnpm dlx shadcn@latest add hover-card
```

Generates `src/components/ui/hover-card.tsx` exporting `HoverCard`, `HoverCardTrigger`, `HoverCardContent`. Adds `@radix-ui/react-hover-card` to `package.json` if not present. The file is generated — do not hand-edit beyond Prettier formatting.

## Data Flow

### Like a comment (happy path)

1. User clicks the heart in `<CommentLikeButton>`.
2. `useLikeCommentMutation(postId).mutate({ id: comment.id })`.
3. `onMutate`:
   - `cancelQueries` on `['comments', postId, 'infinite']`, every `['comments', postId, 'replies', *, 'infinite']` (predicate), and `['comment-likes-preview', comment.id]`.
   - Snapshot via `patchCommentInAllCaches` returning `[key, prev]` tuples; snapshot `['comment-likes-preview', comment.id]` separately.
   - Apply `patchCommentInAllCaches(qc, postId, comment.id, c => patchCommentLike(c, true, viewerSummary))`.
   - Apply `setQueryData(['comment-likes-preview', comment.id], prev => prev ? { data: patchLikesPreviewAddViewer(prev.data, viewerSummary) } : prev)`.
4. Heart flips filled, count ticks up, hover-card panel (if open) shows the viewer at the top.
5. Server returns the updated `Comment`. `onSuccess` is a no-op — optimistic state matches the server's truth (ordering rules reconcile on next hover via the 30s `staleTime` refetch).

### Like a comment (failure)

`onError`: restore every `[key, prev]` tuple, restore the preview snapshot, then `toast.error("Couldn't like comment")`. Heart returns to outline. No automatic retry.

### Unlike a comment

Mirror of the like path — `patchCommentLike(c, false, viewerSummary)` + `patchLikesPreviewRemoveViewer(prev.data, viewerSummary.id)`. Toast on failure: `"Couldn't unlike comment"`.

### Create a reply (happy path)

1. User clicks `Reply` on a top-level comment. `<CommentRow>` sets `replyOpen = true`, mounting `<CommentReplyComposer>`.
2. User types content, clicks Reply (or `⌘ / Ctrl + Enter`).
3. `useCreateCommentReplyMutation(postId, parentCommentId).mutate({ data: { content: trimmed } })`.
4. `onMutate`:
   - Cancel `['comments', postId, 'replies', parentCommentId, 'infinite']` and `['comments', postId, 'infinite']`.
   - Snapshot both.
   - Build optimistic `Comment` `{ id: tempId, postId, parentCommentId, author: viewerAuthor, content: trimmed, counters: { likes: 0, replies: 0 }, viewerState: { liked: false }, likesPreview: { count: 0, preview: [] }, isEdited: false, createdAt: nowIso, updatedAt: nowIso }`.
   - `prependReplyToPages` into the reply cache.
   - `patchCommentInList(commentsKey, parentCommentId, c => bumpCommentReplyCount(c, +1))`.
5. The reply row appears immediately at the top of the (lazily mounted) replies list. If `<CommentRepliesList>` was collapsed, its internal `hasOptimistic` derivation (reading the reply cache for a `tempId` page entry) flips it to `expanded = true` automatically.
6. `onSuccess`: swap `tempId` → server id via `patchCommentInList(replyKey, tempId, () => serverReply)`. `<CommentReplyComposer>`'s own `onSuccess` callback fires → parent sets `replyOpen = false`. The textarea draft is discarded.

### Create a reply (failure)

`onError`: restore both snapshots; `toast.error("Couldn't post reply")`. The composer stays open with the draft preserved (local state in `<CommentReplyComposer>` is not touched by the mutation hook). User can fix and retry.

### Expand "View N replies"

1. User clicks the `↳ View 3 replies` button. `<CommentRepliesList>` sets local `expanded = true`.
2. `useListCommentRepliesInfiniteQuery({ postId, parentCommentId }, { enabled: true })` fires the first page (`GET /comments/:parentCommentId/replies`).
3. While fetching: render up to 3 skeleton rows (capped at `replyCount`).
4. On success: each reply renders as `<CommentRow isReply postId={postId} comment={r} />`, indented under the parent.
5. If `pagination.hasNext`: `<Button variant="ghost" onClick={fetchNextPage}>Show more replies</Button>` at the bottom.
6. User collapses (clicking the expander again) → `expanded = false`, but the cache is preserved — re-expanding is instant.

### Edit a reply

1. User clicks the `…` on their own reply → `CommentOwnerMenu` (Phase E) → Edit.
2. The reply row swaps to inline edit (Phase E pattern unchanged).
3. Save fires `useUpdateCommentMutation(postId).mutate({ id, data: { content } })`.
4. The enhanced `onMutate` walks the reply caches via `patchCommentInAllCaches` — the patch lands wherever the comment lives.
5. `onError`: restore each tuple; toast; row stays in edit mode.

### Delete a reply

1. User clicks `…` → Delete → `AlertDialog` confirm.
2. `useDeleteCommentMutation(postId).mutate({ id })`.
3. Enhanced `onMutate`:
   - `findCommentInAllCaches` returns `{ key, comment }`.
   - `removeCommentFromAllCaches` snapshots and removes; returns tuples.
   - When `comment.parentCommentId !== null`: `patchCommentInList(commentsKey, parentId, c => bumpCommentReplyCount(c, -1))` — also snapshot.
   - `patchAllPostListCaches(postId, p => ({ ...p, counters: { ...p.counters, comments: p.counters.comments - 1 } }))` — preserved from Phase E (snapshot the post-list caches as today).
4. Row disappears; parent's reply count ticks down; post's comment count ticks down.
5. `onError`: restore all three snapshot sets; toast.

### Hover the like-count on a post / comment (happy path)

1. User points at the like-count (e.g. on a post). After Radix's `openDelay` (~300ms), the `HoverCard` opens.
2. `<LikesPreviewHoverCard>` reads `embedded` (the post / comment's `likesPreview`) → renders instantly: up-to-5 rows.
3. `usePostLikesPreviewQuery(postId, embedded, enabled=true)` runs. Because `staleTime: 30_000` + `refetchOnMount: 'always'`, the query refetches every time the panel opens after 30s. On success, the cache updates and the panel re-renders silently (no spinner — `embedded` always renders something).
4. Pointer leaves → Radix closes after `closeDelay`. The query becomes `enabled: false`; React Query keeps the data in cache until `gcTime` (10min).
5. Touch device (`pointer: coarse`): tap opens, tap-outside or second tap closes (Radix defaults). No code branch needed.

### Hover the like-count (failure)

A network error on the background refetch is silent — no toast, no error UI. The panel keeps rendering the `embedded` data (which may have been further patched optimistically by like / unlike mutations). The query stays in error; the next hover triggers a retry.

### Delete account (happy path)

1. User clicks `AvatarMenu` → "Delete account". `<DeleteAccountDialog>` opens.
2. User types their email into the input. As they type, `<Input>` updates local state. **Delete** button is disabled until `typed.trim() === user.email`.
3. User clicks Delete. Mutation starts: button shows a `<Spinner />`, Cancel is disabled.
4. `useDeleteAccount().mutate({ id: user.id })` calls `DELETE /users/:id`.
5. `onSuccess`:
   - `queryClient.clear()` — purge every cache (no stale post/comment data lingers after re-login).
   - `clearAuth()` — drop in-memory access token + reset Zustand auth state.
   - `new BroadcastChannel('auth').postMessage({ type: 'logout' })` — peer tabs drop their session via the existing Phase A `__root.tsx` handler.
   - `router.navigate({ to: '/auth/login' })`.
6. `/auth/login` mounts. The user is fully signed out across every tab.

### Delete account (failure)

`onError`: spinner clears, Cancel re-enables, dialog stays open, `toast.error("Couldn't delete account")`. **No partial state** — caches and auth are untouched because `onSuccess` is the only place we clear. User can retry or Cancel.

### Cross-tab consistency

Phase A's `__root.tsx` already subscribes to `BroadcastChannel('auth')` and handles `{ type: 'logout' }` by calling `clearAuth()` and redirecting. Phase F's delete-account flow reuses this primitive verbatim — no Phase F code in `__root.tsx`.

## Build Order

Each step is a small, reviewable commit ending in passing `pnpm typecheck` and `pnpm lint`. Order is dependency-driven.

1. Add `HoverCard` primitive: `pnpm dlx shadcn@latest add hover-card`. Commit `src/components/ui/hover-card.tsx`.
2. `src/features/feed/feed-cache.ts` — append `patchCommentLike`, `bumpCommentReplyCount`, `patchLikesPreviewAddViewer`, `patchLikesPreviewRemoveViewer`, `prependReplyToPages`, `findCommentInAllCaches`, `patchCommentInAllCaches`, `removeCommentFromAllCaches`.
3. Enhance `src/features/feed/use-update-comment.ts` to use `patchCommentInAllCaches` (Phase E hook; behavior preserved for top-level case).
4. Enhance `src/features/feed/use-delete-comment.ts` to use `findCommentInAllCaches` / `removeCommentFromAllCaches` and bump parent reply counter when target is a reply.
5. `src/features/feed/use-like-comment.ts` + `use-unlike-comment.ts` — mutation hooks.
6. `src/features/feed/use-create-comment-reply.ts` — mutation hook.
7. `src/features/feed/use-list-comment-replies.ts` — infinite query hook.
8. `src/features/feed/use-post-likes-preview.ts` + `use-comment-likes-preview.ts` — query hooks with `initialData`.
9. `src/features/auth/use-delete-account.ts` — mutation hook with caches/auth teardown + redirect.
10. `src/components/feed/CommentLikeButton.tsx` — depends on (5) + (8).
11. `src/components/feed/CommentReplyButton.tsx` — pure presentational.
12. `src/components/feed/CommentReplyComposer.tsx` — depends on (6).
13. `src/components/feed/CommentRepliesList.tsx` — depends on (7).
14. `src/components/feed/LikesPreviewHoverCard.tsx` — depends on (1) + (8).
15. Modify `src/components/feed/PostCardCounters.tsx` — wrap the like-count text + heart icon in `<LikesPreviewHoverCard kind="post" />`.
16. Modify `src/components/feed/CommentRow.tsx` — render like row, reply button, reply composer, replies list. `isReply` prop wired.
17. `src/components/shell/DeleteAccountDialog.tsx` — depends on (9).
18. Modify `src/components/shell/AvatarMenu.tsx` — add separator + "Delete account" item + dialog mount.
19. Manual smoke gate (final task — see Testing Strategy).

## Open Items / Risks

- **`post.counters.comments` semantics on reply create/delete.** The server may count `post.counters.comments` as either top-level-only or top-level + replies. Phase E's delete-comment hook decrements it for any deleted comment. Phase F's reply-create hook does **not** increment it. If smoke test #11 surfaces drift, fix is small: either include replies on create, or strip them from delete's optimistic patch. Resolved during smoke and documented in the plan.
- **`HoverCard` open-delay UX on slow networks.** If `getPostLikesPreview` is slow (>1s) and `staleTime` is exceeded, the panel renders the embedded preview, then "snaps" to the refetched order. Acceptable; if jarring, lengthen `staleTime` to 5min.
- **AvatarMenu density.** The menu currently holds Profile, a placeholder Settings item (toasts "Settings coming soon"), and Logout — three items separated into two groups. Adding "Delete account" as a fourth item in its own destructive group (after a second separator) keeps the visual hierarchy clear. If a future phase replaces the Settings placeholder with a real `/settings` route, Delete account moves there too and the AvatarMenu shrinks back to identity-actions only.
- **Cross-tab logout race.** After `useDeleteAccount.onSuccess`, we broadcast before navigating. A peer tab finishing a query between `queryClient.clear()` and the broadcast may briefly render stale data. Worst case is a sub-100ms flash. Acceptable.
- **Reply cache memory.** Every expanded reply chain stays in cache (no `gcTime` override). Default `gcTime: 10min` reclaims unused entries after the user navigates away.
- **Optimistic likes-preview ordering.** Optimistic prepend may diverge from the server's "top 5 most-recent" rule (e.g., if the user just liked while three others also did). The next refetch reconciles. Brief divergence is acceptable.
- **Touch hover-card tap-target.** The like-count text is small; Radix's `HoverCardTrigger` inherits the wrapped element's hit area. If smoke testing on a real device surfaces a tap-miss issue, wrap the count in a `Button` `variant="ghost"` `size="sm"` to expand the hit area.
- **Optimistic reply with images.** Out of scope — replies are text-only per the API model (`CreateCommentBody` is `{ content: string }` only). No code path to write here, but worth noting that a future "rich reply" would need significant Composer-style state machine work.
- **No tests is the biggest risk** (same as Phase E). The pure helpers `patchCommentLike`, `bumpCommentReplyCount`, `patchLikesPreviewAddViewer/RemoveViewer`, `findCommentInAllCaches`, and the enhanced edit / delete cache walk are exactly the unit-test surface to revisit if regressions bite.

## Testing Strategy

Manual smoke gate run against `pnpm dev` (port 3000) with the backend on `http://localhost:8787`. Test fixtures:

- **Two test users** A (logged-in viewer) and B (someone else).
- **Pre-seeded data:** at least one post with ≥ 1 comment from A and ≥ 1 comment from B; at least one top-level comment with ≥ 6 existing replies (so pagination is exercised); at least one comment with ≥ 6 likers (so the "+N others" footer is exercised).
- **DevTools Network tab open** to verify: reply-list firing only on expand; hover-card background refetches firing only after `staleTime`; delete-account hitting `DELETE /users/:id`.
- **Two tabs** logged in as A, on `/`, for cross-tab smoke.

A failure on any item means fixing it before the phase is declared done.

### Regression (Phases A–E still work)

1. **Phase E regression sweep.** Cold-load `/` → `/friends` → `/friend-requests` → `/users/<B>`. Sidebars live. Compose text + image post → grid renders. On own post: change visibility (no confirm), delete via owner menu + AlertDialog (cancel). Edit own comment, delete own comment. Avatar upload still works. Profile name edit still works.
2. **Phase C regression.** Like / unlike a post. Compose a comment under a post — appears in the comments list.

### Comment likes

3. **Like a top-level comment.** Click heart on B's comment → fills instantly, count ticks +1. Network: `POST /comments/:id/likes`.
4. **Unlike.** Click filled heart → outlines, count ticks -1. Network: `DELETE /comments/:id/likes`.
5. **Like reflects in hover-card.** Hover the count on a comment with ≥ 1 like → panel shows top-5. Like the comment → panel updates (viewer now at the top). Unlike → viewer removed.
6. **Like failure.** With backend down, click heart → snaps back after ~100ms + `toast.error("Couldn't like comment")`.

### Reply create

7. **Reply on a top-level comment.** Click Reply on B's comment → composer appears below. Type "Hi" + click Reply → reply appears indented under the parent. Parent's `↳ View N replies` count ticks +1. Network: `POST /comments/:parent/replies`.
8. **Reply via `⌘ / Ctrl + Enter`.** Same flow but submit via keyboard.
9. **Reply cancel (Esc + button).** Open composer, type a draft, press Esc → composer closes, no mutation. Re-open → composer is empty (draft did not persist after close). Open again, type, click Cancel → same.
10. **Reply failure.** Backend down → click Reply → reply ghost appears then snaps back + toast.error. Composer stays open with draft preserved.

### Reply list expansion

11. **Expand replies.** Click `↳ View N replies` → skeleton rows appear briefly → real replies render indented. Network: `GET /comments/:parent/replies`.
12. **Pagination.** On a parent with ≥ 6 replies (limit=5), `Show more replies` button appears at the bottom. Click → next page fetches and appends.
13. **Collapse + re-expand.** Click expander while expanded → collapses. Click again → expands instantly (no network — cache is hot).
14. **Auto-expand on optimistic reply.** On a collapsed parent with `replyCount = 0` (no replies), submit a reply → list auto-expands to show the new reply.

### Reply parity

15. **Like a reply.** Hover a reply row, click heart → fills, count ticks +1. Same network shape as comment like.
16. **Edit own reply.** On A's reply: ellipsis → Edit → textarea swaps in → modify → Save → row re-renders with new content. Refresh confirms.
17. **Delete own reply.** Ellipsis → Delete → AlertDialog → Confirm → reply disappears AND parent's `View N replies` count ticks down by 1 AND post comment-counter ticks down by 1.
18. **No Reply button on reply rows.** Hover any reply row → no "Reply" affordance is rendered.

### Like-preview hover-card

19. **Post hover-card.** Hover a post's like count → panel opens after ~300ms, shows top-5 likers + "and N others" footer when total > 5. Pointer-leave → closes after ~150ms.
20. **Comment hover-card.** Same flow on a comment's like count.
21. **Zero-likes hover-card suppressed.** On a comment with `count === 0`, hovering the count area opens nothing (count text is not rendered when count is 0).
22. **Background refetch after 30s.** Open the hover-card → close → wait 31s → re-open → Network shows a `GET /…/likes/preview` call. Panel renders embedded immediately then silently refreshes.
23. **Optimistic prepend.** Open hover-card on a comment B liked but A has not → A's avatar absent. Close. Like the comment as A → re-open hover-card → A appears at the top of the preview.
24. **Touch tap behavior.** Toggle DevTools "device toolbar" → tap on a like count → panel opens. Tap outside → closes. (No `:hover` selectors firing on tap.)

### Delete account — guard rails

25. **Delete-account opens dialog.** `AvatarMenu` → "Delete account" → `AlertDialog` mounts with email-input field. Delete button is disabled.
26. **Wrong email keeps Delete disabled.** Type a wrong email → Delete stays disabled → mismatch message under the input.
27. **Correct email enables Delete.** Type exact email → Delete enables.
28. **Cancel discards.** Click Cancel → dialog closes, no mutation. Re-open → input is empty.

### Delete account — happy

29. **Happy delete.** Type email, click Delete → spinner on Delete, Cancel disabled → network call to `DELETE /users/:id` (200) → caches clear → redirect to `/auth/login`. Open DevTools Application > Storage: no auth token in memory; refresh confirms.

### Delete account — failure

30. **Failure preserves state.** Backend down. Type email, click Delete → spinner → ~100ms later, spinner clears, Cancel re-enables, dialog stays open, `toast.error("Couldn't delete account")`. Caches and auth untouched.

### Cross-tab consistency

31. **Cross-tab logout.** Open `/` in tab 1 + tab 2 as user A. In tab 2, delete account → tab 2 redirects to login. Switch to tab 1: it also redirects to `/auth/login` within ~100ms (via existing Phase A BroadcastChannel handler).

### Dark mode

32. **Dark mode.** Toggle dark theme. All new surfaces render with adequate contrast: heart fill, comment-like row, reply composer, indented reply rows, `↳ View N replies` button, hover-card content, delete-account dialog, email input, mismatch warning, destructive Delete button.

### Build hygiene

33. **`pnpm typecheck`** exits 0.
34. **`pnpm lint`** exits 0 with no warnings.
35. **`git status`** clean after the final commit.

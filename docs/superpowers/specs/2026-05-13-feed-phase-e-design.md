# Feed (Phase E) — Media & Ownership — Design

**Date:** 2026-05-13
**Status:** Draft (awaiting user review of written spec)
**Phase of:** Five-phase rollout — A: Auth (done) → B: App shell (done) → C: Feed + composer + likes + comments (done) → D: Sidebar + friends + profiles (done) → **E: Image upload, avatar upload, profile edit, post & comment ownership (this spec)**

## Purpose

Close the loop on every user-generated-media and ownership affordance that has a backend endpoint but no UI today. After Phase E, an authenticated user can:

1. Attach up to four images to a new post via the existing Composer. Images upload to R2 via presigned URLs and are committed atomically with the post body.
2. See those images rendered on every `PostCard` (own feed, friend's profile, anywhere the card mounts) as an adaptive 1/2/3/4 grid, with a lightbox on click.
3. Upload a new avatar from their own profile page; the new image is presigned, PUT to R2, committed to the user record, and immediately visible everywhere the user is rendered.
4. Edit their own first and last name inline on their profile.
5. Manage their own posts: change visibility public ↔ private, or delete entirely, via a three-dot menu in the post header. Delete is confirmed with an alert dialog; visibility flip is a single click.
6. Manage their own comments: edit (inline textarea) or delete (alert-dialog confirm) via a three-dot menu at the row's right edge.
7. Choose visibility (Public / Private) at post-creation time via a small pill selector in the Composer.

Phase A/B/C/D surfaces are untouched: auth flow, app shell, feed pagination, like / unlike, comment compose, friend mutations, profile read view (for other users), sidebar cards remain bit-for-bit identical from a Phase D-finished baseline.

## Non-Goals

- **No comment likes, comment replies, post-like hover previews, account deletion (`deleteUser`).** Endpoints exist but are deferred to a hypothetical Phase F. Their UI surfaces (heart icon under each comment, "Show more replies" affordance, hover-card on like count, danger zone in settings) are not added.
- **No client-side avatar crop or preview-before-upload.** The picked file is what gets committed. `<AvatarImage>` handles `object-cover` rendering. A crop step would add a dependency (`react-easy-crop`) or ~150 lines of canvas math for marginal UX gain.
- **No image edit on existing posts.** Image attachments are immutable after creation. Editing a post is out of scope entirely — neither text edit on posts nor image swap. (Comment edit is in scope; post edit is not, because the existing API exposes only `updatePostVisibility`, not a general `updatePost`.)
- **No image attachments on comments.** Comments stay text-only.
- **No drag-and-drop onto the Composer or paste-image-from-clipboard.** File picker only (per Q2 / A).
- **No undo on post delete or comment delete.** The `AlertDialog` confirmation is the only safety. A misclick requires re-posting / re-commenting.
- **No optimistic avatar swap.** The avatar URL only updates after `commitAvatar` returns. The reasoning: the new R2 URL is not knowable client-side until the server returns it, so an optimistic swap would render a broken image briefly.
- **No localStorage for composer visibility.** Session-only state; always defaults to `'public'` on cold load.
- **No private-icon badge on rendered `PostCard`.** Only the owner ever sees their own private posts (server filters the feed), so the visual cue is redundant. Owner can confirm via the menu's label.
- **No re-presign on R2 URL expiry mid-session.** Normal posting flows complete in under a minute; presigned URLs are valid far longer. If a user idles past `expiresAt`, the upload will 403 and the slot transitions to `error` — same path as any other R2 failure.
- **No global upload progress indicator** (status bar, banner, etc.). Per-thumb progress in the Composer strip is sufficient.
- **No automated tests.** Same manual smoke gate as Phases A / B / C / D. Pure helpers (`upload-to-r2.ts`, `read-image-dimensions.ts`, `feed-cache.ts` additions) and the stateful `use-composer-image-uploads.ts` hook are the unit-test surface to revisit if a regression bites.
- **No re-ordering existing post images.** Reorder is only available pre-post (in the Composer strip). After publication, image order is server-of-record.
- **No accessible bulk delete or multi-select.** All delete operations are one-at-a-time.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Folder layout | New `src/features/media/` for upload helpers and presign/commit hooks; new mutation hooks under `src/features/feed/` (`use-delete-post`, `use-update-post-visibility`, `use-update-comment`, `use-delete-comment`); new `src/features/profile/use-update-user.ts`. Presentational pieces in `src/components/feed/` and one extension of `src/components/friends/ProfileHeader.tsx`. | Matches the Phase C / D split — feature-folder per domain, components per render-tree. |
| Image upload cap | 4 images per post (UI), even though the API allows up to 20 | Keeps the preview strip and the rendered grid visually sane on a sidebar-flanked feed column. |
| File acceptance | `image/jpeg`, `image/png`, `image/webp` only (from `PresignBody` enum) | Mirrors backend validation; rejecting client-side keeps the UX snappy. |
| Client-side size limits | 10 MB for post images; 5 MB for avatar | Defensive — server limits unknown. Failing fast saves a wasted presign + PUT. |
| Image upload orchestration | Stateful hook `useComposerImageUploads` owns a `Map<localId, ImageUploadState>` state machine (`reading → pending → presigning → uploading → done` / `error`) | One state machine keeps preview, progress, retry, and reorder logic in a single file rather than scattered across Composer + strip. |
| Presign call shape | One batched `presignPostUploads({ count: N, contentTypes: [...] })` per `add()` batch, not one call per file | Matches the API (`count: 1-20`); halves round trips for multi-pick. |
| R2 PUT mechanism | `XMLHttpRequest` (not `fetch`) | Browsers without streaming `fetch` bodies can't surface upload progress; the strip's per-thumb progress bar requires `xhr.upload.onprogress`. |
| Dimension extraction | Client-side via `URL.createObjectURL(file)` + `new Image()`, awaiting `onload` for `naturalWidth` / `naturalHeight` | The `createPost` payload requires `width`/`height` per image; reading them client-side avoids a second server round trip. |
| Reordering implementation | Hand-rolled pointer drag (4 items max, single row) | A new dependency (`@dnd-kit/core`) is unjustified for one component with four items. ~80 lines of `pointerdown/move/up` + threshold-swap. |
| Image grid layout | Adaptive 1 / 2 / 3 / 4 in `<PostImageGrid>` — 1 full-width with cap, 2 side-by-side, 3 = big left + 2 stacked right, 4 = 2×2 | Canonical social-feed pattern; reads as "production grade". |
| Lightbox primitive | shadcn `Dialog` (added via `pnpm dlx shadcn@latest add dialog`) controlled-state, prev/next arrows, ArrowLeft/ArrowRight/Esc keyboard | Reuses an established shadcn primitive over hand-rolling a portal. |
| Owner-menu primitive | Existing `DropdownMenu` (already used in `AvatarMenu`) + new shadcn `AlertDialog` (added via `pnpm dlx shadcn@latest add alert-dialog`) for destructive confirmation | Standardizes the destructive flow across post delete and comment delete. |
| `PostOwnerMenu` placement | Trigger absolute-positioned top-right of the post header, only when `post.author.id === currentUser.id` | Standard ellipsis-in-header pattern. |
| `CommentOwnerMenu` visibility | `md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100` — invisible-until-hover at `md`+, always visible below `md` | Matches FB-style desktop affordance, but stays touch-discoverable. |
| Comment edit UX | Inline swap inside the existing `CommentRow` (local `isEditing` state, textarea + Save / Cancel, Esc to cancel) | Avoids a new modal and matches the conversational pattern of the comment list. |
| Visibility flip confirmation | None — single-click optimistic flip | Reversible action. Confirmation would be noise. |
| Delete confirmation | `AlertDialog` for both post delete and comment delete | Irreversible action. The dialog is the safety. |
| Avatar update is non-optimistic | `useCommitAvatar` only writes the cache on `onSuccess`; the avatar shows a spinner overlay during PUT + commit | The new R2 URL is server-generated; optimistically swapping to the object URL would flash briefly to a broken image once the object URL is revoked. |
| Profile name optimistic update | `useUpdateUser` writes `useAuthStore.setUser(...)` + `setQueryData(['user', id], …)` on `onMutate`, rolls back on error | Name change is purely textual and instantly reflectable everywhere. |
| Post / visibility cache strategy | Reuse Phase D's `patchAllPostListCaches` + `snapshotPostListCaches` + `restorePostListCaches`. Add a new sibling `removePostFromPages` (pure) and a `removePostFromAllPostListCaches` helper to `feed-cache.ts`. | One cache-fan-out mechanism for every post-list mutation. |
| Comment cache strategy | Pure helpers `patchCommentInList`, `removeCommentFromList` over the existing `['comments', postId, 'infinite']` cache; reuse Phase C's comment list shape. Comment-counter bumps reuse `bumpPostCommentCount` (Phase C). | Mirrors the post-cache pattern. |
| Composer visibility | New `useState<'public' \| 'private'>` in `Composer.tsx`; reset to `'public'` after success. No persistence. | Smallest surface; matches user expectation that "broadcast by default" applies every session. |
| Toasts | `toast.error(...)` for failures (per existing pattern). `toast.info(...)` for the cap message ("Max 4 images per post"), rejected file type, rejected file size. **No success toasts.** | Consistent with Phases C and D. |
| Sample data deletion | None. All Phase E surfaces wire to existing live data. | Phase D already deleted the legacy `SAMPLE_*` exports it owned. |
| Path-alias style | `.ts` extensions on `@/gen/api/*` imports; bare on feature modules where Phase C/D do | Match each directory's existing style. |

## Components & Responsibilities

Each module has one job, narrow inputs, and is reasoned about in isolation.

### Pure helpers — `src/features/media/`

| Helper | Signature | Caller |
|---|---|---|
| `uploadToR2` | `(uploadUrl: string, file: File, contentType: string, signal?: AbortSignal, onProgress?: (loaded: number, total: number) => void) => Promise<void>` | `useComposerImageUploads` (post images) and `useCommitAvatar` flow (in the avatar uploader) |
| `readImageDimensions` | `(file: File) => Promise<{ width: number; height: number }>` | `useComposerImageUploads` |

Both helpers are framework-free; `uploadToR2` uses `XMLHttpRequest` and returns a promise that resolves on `xhr.status` in `[200, 299]`. `readImageDimensions` creates an object URL, loads `new Image()`, reads `naturalWidth` / `naturalHeight`, revokes the URL, resolves.

### Pure helper additions — `src/features/feed/feed-cache.ts`

| Helper | Signature | Caller |
|---|---|---|
| `removePostFromPages` | `<T extends PostListResponse>(pages: PostPages<T> \| undefined, postId: string) => PostPages<T> \| undefined` | `useDeletePost` |
| `removePostFromAllPostListCaches` | `(queryClient: QueryClient, postId: string) => void` | `useDeletePost` |
| `patchCommentInList` | `(pages: CommentPages \| undefined, commentId: string, patch: (c: Comment) => Comment) => CommentPages \| undefined` | `useUpdateComment` |
| `removeCommentFromList` | `(pages: CommentPages \| undefined, commentId: string) => CommentPages \| undefined` | `useDeleteComment` |

`CommentPages` is an `InfiniteData<ListCommentsQueryResponse, string \| undefined>` alias — same envelope as the post list, just over the comment shape. The comment helpers live in `feed-cache.ts` (next to post helpers) rather than a new `comment-cache.ts` because they are small and consumed only by Phase C/E.

### Query / mutation hooks

**Media (`src/features/media/`):**

| Hook | Behavior |
|---|---|
| `usePresignPostUploadsMutation` | Thin wrapper over generated `usePresignPostUploads`; **no cache writes, no toast** (the orchestrator hook handles errors per-slot). |
| `usePresignAvatarMutation` | Thin wrapper over generated `usePresignAvatar`; no cache writes. |
| `useCommitAvatarMutation` | Wraps `useCommitAvatar`. On `onSuccess`: write returned `User` into `setQueryData(['user', userId], user)` AND `useAuthStore.setUser(user)` if `userId === me`. On error: toast. **Non-optimistic.** |
| `useComposerImageUploads` | Stateful hook (see Data Flow §). Owns the state machine. Exposes `add(files)`, `remove(localId)`, `retry(localId)`, `reorder(from, to)`, `reset()`, and derived `items: ImageUploadState[]`, `allDone: boolean`, `anyPending: boolean`, `postImages: CreatePostBody['images']`. |

**Feed (`src/features/feed/`):**

| Hook | Behavior |
|---|---|
| `useDeletePostMutation` | Wraps `useDeletePost`. `onMutate`: cancelPostListQueries; snapshot all post-list caches; `removePostFromAllPostListCaches`; return `{ snapshot, postId }`. `onError`: `restorePostListCaches(snapshot)` + `toast.error("Couldn't delete post")`. **No `onSettled` refetch.** |
| `useUpdatePostVisibilityMutation` | Wraps `useUpdatePostVisibility`. `onMutate`: cancel; snapshot; `patchAllPostListCaches(postId, p => ({ ...p, visibility: newVisibility }))`; return `{ snapshot }`. `onError`: restore + toast. |
| `useUpdateCommentMutation(postId)` | Wraps `useUpdateComment`. `onMutate`: cancel `['comments', postId, 'infinite']`; snapshot; `setQueryData(..., patchCommentInList(prev, id, c => ({ ...c, content, updatedAt: nowIso })))`. `onError`: restore + toast. |
| `useDeleteCommentMutation(postId)` | Wraps `useDeleteComment`. `onMutate`: cancel `['comments', postId, 'infinite']` and post-list keys; snapshot both; `setQueryData(commentsKey, removeCommentFromList(prev, id))` AND `patchAllPostListCaches(postId, bump comments -1)`. `onError`: restore both + toast. |

**Profile (`src/features/profile/`):**

| Hook | Behavior |
|---|---|
| `useUpdateUserMutation` | Wraps `useUpdateUser`. `onMutate`: snapshot `useAuthStore.getState().user` and `getQueryData(['user', id])`; `setUser({...prev, ...patch})` (auth store) + `setQueryData(['user', id], {...prev, ...patch})`. `onError`: restore both + toast. |

### Components — `src/components/feed/`

| Component | Props | Renders |
|---|---|---|
| `ComposerImageStrip` | `{ items, onRemove, onRetry, onReorder }` | Horizontal strip of up to 4 thumbs (`size-20` square). Each thumb: image (object-cover), progress overlay (semi-transparent dark layer with bottom bar showing %), error overlay with retry icon, hover X-button to remove, native pointer-drag handle. Empty state: not rendered (composer collapses). |
| `ComposerVisibilitySelector` | `{ value, onChange, disabled }` | Pill button (`Globe2` or `Lock` icon + label "Public" / "Private" + chevron). Clicking opens a `DropdownMenu` with two `DropdownMenuRadioItem`s. |
| `PostImageGrid` | `{ images: PostImage[] }` | 1/2/3/4 adaptive grid sorted by `position`. Each image is a `<button>` (focusable) that opens `<PostImageLightbox initialIndex={i}>`. |
| `PostImageLightbox` | `{ images, initialIndex, open, onOpenChange }` | shadcn `Dialog` rendered as a full-viewport overlay; centered `<img>` with `max-h-[90vh] max-w-[90vw] object-contain`; prev / next chevron buttons (hidden if length ≤ 1); Esc + arrow-key handlers via `onKeyDown` at the dialog content level. |
| `PostOwnerMenu` | `{ post: Post }` | `DropdownMenu` with `MoreHorizontal` trigger. Items: visibility toggle (label flips by `post.visibility`) → single-click optimistic; `<DropdownMenuSeparator />`; "Delete post" → opens internal `AlertDialog` → on confirm fires `useDeletePostMutation`. Returns `null` when `post.author.id !== currentUser.id`. |
| `CommentOwnerMenu` | `{ comment, postId, onEdit, onDeleted }` | `DropdownMenu` with `MoreHorizontal` trigger. Items: "Edit" → calls `onEdit()` (sets row's local `isEditing = true`); "Delete" → `AlertDialog` → fires `useDeleteCommentMutation`. Returns `null` when not owner. Visibility classes per Q7. |

### Component modifications

| File | Change |
|---|---|
| `Composer.tsx` | Wire `useComposerImageUploads`. Add hidden `<input type="file" multiple accept="image/jpeg,image/png,image/webp" />` triggered by the existing image icon button. Render `<ComposerImageStrip items={items} ... />` between textarea and bottom action row when `items.length > 0`. Render `<ComposerVisibilitySelector value={visibility} onChange={setVisibility} disabled={mutation.isPending} />` in the bottom row, between image icon and Post button. `canSubmit = (trimmed.length > 0 \|\| items.length > 0) && allDone && !mutation.isPending`. Submit passes `images: postImages` and `visibility` to `createPost`. On success, also call `uploads.reset()` and `setVisibility('public')`. |
| `PostCard.tsx` | Render `<PostImageGrid images={post.images} />` between content `<p>` and `<PostCardCounters>` when `post.images.length > 0`. Render `<PostOwnerMenu post={post} />` absolute-positioned at top-right of the header. |
| `CommentRow.tsx` | Add `group` class to root. Wrap row text in a conditional: when `isEditing`, render a `<textarea>` + Save / Cancel buttons; otherwise render the existing text. Render `<CommentOwnerMenu comment={comment} postId={postId} onEdit={() => setIsEditing(true)} />` at the row's right edge. Save fires `useUpdateCommentMutation(postId).mutate({...})`; on success set `isEditing = false`. |
| `ProfileHeader.tsx` | When `user.id === currentUser?.id`: wrap avatar in a `<div className="relative">` with a small camera-icon button (bottom-right, `absolute`) that triggers a hidden `<input type="file">`; show a spinner overlay while `useCommitAvatarMutation.isPending`. Add a pencil-icon button beside the name; click → swap name display for two inline `<input>`s + Save / Cancel. Save fires `useUpdateUserMutation`. The pencil and camera button are absent when `user.id !== currentUser?.id`. |
| `feed-cache.ts` | Add `removePostFromPages`, `removePostFromAllPostListCaches`, `patchCommentInList`, `removeCommentFromList`. Define `CommentPages` alias. No changes to existing exports. |

### Hidden file-input pattern

Both `Composer.tsx` and `ProfileHeader.tsx` use the same pattern: a `useRef<HTMLInputElement>(null)` pointing at a `<input type="file" className="hidden" />` element, with the user-visible button calling `inputRef.current?.click()`. `onChange` reads `e.target.files`, calls the corresponding handler, then sets `e.target.value = ''` so re-picking the same file fires `change`.

## Data Flow

### Posting with images (happy path)

1. User opens `/`, clicks the image icon in Composer. Native picker opens (`multiple`, `accept` constrained to allowed types).
2. User selects 3 jpegs (sizes within limits). `onChange(e)` calls `uploads.add(e.target.files)`.
3. `useComposerImageUploads.add` for each file in parallel:
   - Validates type + size; rejected files toast.info + are skipped.
   - Pushes `{ status: 'reading', localId, file, previewUrl }` into the map.
   - `await readImageDimensions(file)` → on success transitions to `{ status: 'pending', ...prev, width, height }`. On failure → `'error'`.
4. After the parallel `Promise.all` of dim-reads resolves, the hook collects all `'pending'` slots and fires **one** `presignPostUploads({ count: 3, contentTypes: [...] })`. On success, each `PresignEntry` is matched to a slot (by enumeration order) and the slot transitions `'pending' → 'uploading'` with `r2Key`, `uploadUrl`.
5. The hook then fires three parallel `uploadToR2(uploadUrl, file, contentType, signal, progressCb)` calls. Each `progressCb` updates the slot's `progress` field; `ComposerImageStrip` re-renders the progress bar. On 2xx → `'done'`. On non-2xx or abort → `'error'`.
6. With all three at `'done'`, `allDone === true`. Post button enables.
7. User clicks Post. `Composer.submit()` calls:
   ```ts
   createPost.mutate({
     data: {
       content: trimmed,
       visibility,
       images: postImages, // [{ r2Key, width, height, position }, ...]
     },
   })
   ```
8. `onSuccess` (existing Phase C `useCreatePostMutation`) prepends to feed cache.
9. The Composer calls `uploads.reset()` (revoke all object URLs, clear map), `setContent('')`, `setVisibility('public')`.
10. New `<PostCard>` renders with `post.images` populated from the server response; `<PostImageGrid>` renders the 3-image layout.

### Posting with images (failures)

| Failure | Behavior |
|---|---|
| Dim-read fails on a slot | Slot → `{ status: 'error', error: 'Could not read image' }`. User clicks the X to remove. |
| Batch presign fails | Every `pending` slot → `'error'`. Slot-level retry re-runs presign for just that slot (single-item call). Toast on the batch failure. |
| Single R2 PUT fails | That slot → `'error'`. Slot-level retry re-runs `uploadToR2` with the same presigned URL if `expiresAt` is still future; otherwise re-presigns first. |
| `createPost` fails | Existing Phase C error toast. Composer state preserved (text, slots, visibility). User retries. The R2 objects already uploaded orphan; backend TTL sweeps. |
| User removes a slot mid-upload | The `AbortController` for that slot aborts the in-flight `xhr`. Object URL revoked. Slot removed. R2 object orphans if upload partially succeeded; backend TTL sweeps. |

### Cap enforcement

`useComposerImageUploads.add` checks `items.length + files.length` against the 4-cap *before* validating types/sizes. If `over`, the hook accepts the first `4 - items.length` valid files (post type/size validation) and `toast.info('Max 4 images per post')` once for the batch.

### Avatar upload (happy path)

1. User on `/users/<me>`, clicks camera-icon button. Hidden file input opens picker.
2. `onChange(e)`: read `file = e.target.files[0]`. Validate type (image/jpeg|png|webp) + size (≤ 5 MB). Reject with toast on fail.
3. Set local `isUploading = true` (Profile header local state). Avatar overlay spinner renders.
4. `await presignAvatar.mutateAsync({ id: me, data: { contentType: file.type } })` → `{ uploadUrl, objectKey }`.
5. `await uploadToR2(uploadUrl, file, file.type)`.
6. `await commitAvatar.mutateAsync({ id: me, data: { objectKey } })` → response `data: User`.
7. `useCommitAvatarMutation.onSuccess` writes `setUser(user)` + `setQueryData(['user', me], user)`. Spinner clears (driven by `isUploading = false` in `finally`). Header, sidebar, AvatarMenu, anywhere current-user avatar renders all reflect new URL automatically.

### Avatar upload (failures)

| Failure | Behavior |
|---|---|
| Type / size reject | Local validation; toast.info; no spinner shown; no calls made. |
| Presign fails | Spinner clears; `toast.error("Couldn't update avatar")`. |
| R2 PUT fails | Same toast; R2 object never committed; no cache changes. |
| Commit fails | Same toast; R2 object orphans (backend TTL); no cache changes. |

### Profile name edit (happy path)

1. User clicks pencil-icon next to their own name. Header swaps from `<h1>{firstName} {lastName}</h1> <PencilButton />` to `<input firstName /> <input lastName /> <Button Save /> <Button ghost Cancel />`.
2. User edits last name, clicks Save (or presses Enter in either input).
3. `useUpdateUserMutation.mutate({ id: me, data: { firstName, lastName } })`.
4. `onMutate`: snapshot `useAuthStore.user` and `queryClient.getQueryData(['user', me])`; `setUser({...prev, firstName, lastName})`; `setQueryData(['user', me], {...prev, firstName, lastName, updatedAt: nowIso})`. Header text re-renders instantly; sidebar `AvatarMenu` greeting also re-renders.
5. Server returns updated `User`. `onSuccess` writes the server's value (authoritative `updatedAt`).
6. Header switches back to display mode.

### Profile name edit (failures)

- Empty / whitespace input on Save: button stays disabled; no mutation fires.
- Server error: rollback both stores; `toast.error("Couldn't update name")`; inputs stay open for retry.

### Post visibility flip

1. User clicks `…` on own post → menu opens.
2. User clicks "Make private" (or "Make public").
3. `useUpdatePostVisibilityMutation.mutate({ id: post.id, data: { visibility: target } })`.
4. `onMutate`: snapshot all post-list caches; `patchAllPostListCaches(post.id, p => ({ ...p, visibility: target }))`. Menu label flips on next re-render.
5. `onError`: restore + toast.

### Post delete

1. User clicks `…` on own post → menu → "Delete post".
2. `AlertDialog` opens ("Delete this post? This can't be undone." / Cancel / **Delete**).
3. On Delete click: dialog closes; `useDeletePostMutation.mutate({ id: post.id })`.
4. `onMutate`: snapshot; `removePostFromAllPostListCaches(qc, post.id)`. Card disappears from feed and from any user-posts list it's in.
5. `onError`: restore; toast.

### Comment edit

1. User hovers their own comment → ellipsis becomes visible → click → menu → "Edit".
2. Row's local `isEditing = true`. Text swaps to `<textarea defaultValue={comment.content} autoFocus />` + Save / Cancel buttons.
3. Save (or `⌘/Ctrl + Enter`): `useUpdateCommentMutation(postId).mutate({ id: comment.id, data: { content: trimmed } })`.
4. `onMutate`: cancel + snapshot `['comments', postId, 'infinite']`; `setQueryData(commentsKey, patchCommentInList(prev, id, c => ({ ...c, content: trimmed, updatedAt: nowIso })))`.
5. `onSuccess` (sub-form): set `isEditing = false`.
6. `onError`: restore; toast; `isEditing` stays `true` so user can fix and retry.
7. Cancel button or Esc: discard local input, `setIsEditing(false)`.

### Comment delete

1. User clicks ellipsis on own comment → "Delete" → `AlertDialog` ("Delete this comment?").
2. On confirm: `useDeleteCommentMutation(postId).mutate({ id: comment.id })`.
3. `onMutate`: cancel comments key + post-list keys; snapshot both; remove from comments list AND `patchAllPostListCaches(postId, p => ({ ...p, counters: { ...p.counters, comments: p.counters.comments - 1 } }))`.
4. `onError`: restore both; toast.

### Lightbox

1. User clicks an image in `<PostImageGrid>`. Grid sets local `lightbox = { open: true, index: clickedIndex }`.
2. `<PostImageLightbox>` mounts, focused via shadcn `Dialog` focus trap.
3. ArrowRight: `setIndex(i => (i + 1) % images.length)`. ArrowLeft: wraps the other way.
4. Esc or click outside: `onOpenChange(false)` → unmount.
5. The lightbox is non-modal-routable — closing returns to the same scroll position.

## Build Order

Each step is a small, reviewable commit ending in passing `pnpm typecheck` and `pnpm lint`. The order is dependency-driven.

1. Add shadcn primitives: `pnpm dlx shadcn@latest add dialog alert-dialog`. Commit `src/components/ui/dialog.tsx` and `src/components/ui/alert-dialog.tsx`.
2. `src/features/feed/feed-cache.ts` — add `removePostFromPages`, `removePostFromAllPostListCaches`, `CommentPages` alias, `patchCommentInList`, `removeCommentFromList`.
3. `src/features/feed/use-delete-post.ts` + `use-update-post-visibility.ts` — mutation hooks.
4. `src/features/feed/use-update-comment.ts` + `use-delete-comment.ts` — mutation hooks.
5. `src/features/profile/use-update-user.ts` — mutation hook.
6. `src/features/media/upload-to-r2.ts` + `read-image-dimensions.ts` — pure helpers.
7. `src/features/media/use-presign-post-uploads.ts`, `use-presign-avatar.ts`, `use-commit-avatar.ts` — thin wrappers + the avatar cache write.
8. `src/features/media/use-composer-image-uploads.ts` — the orchestrator hook. Depends on (6) and (7).
9. `src/components/feed/PostOwnerMenu.tsx` — depends on (3) + alert-dialog.
10. `src/components/feed/CommentOwnerMenu.tsx` — depends on (4) + alert-dialog.
11. `src/components/feed/ComposerImageStrip.tsx` — depends on (8) via shape only.
12. `src/components/feed/ComposerVisibilitySelector.tsx` — small pure component.
13. `src/components/feed/PostImageLightbox.tsx` — depends on (1).
14. `src/components/feed/PostImageGrid.tsx` — depends on (13).
15. Modify `src/components/feed/PostCard.tsx` — render grid + owner menu.
16. Modify `src/components/feed/Composer.tsx` — wire uploads hook + strip + visibility selector + new submit gate.
17. Modify `src/components/feed/CommentRow.tsx` — `isEditing` state + textarea swap + owner menu.
18. Modify `src/components/friends/ProfileHeader.tsx` — camera overlay + pencil-name edit. Depends on (5) + (7).
19. Manual smoke gate (final task — see Testing Strategy).

## Open Items / Risks

- **Empty-content image-only posts.** The generated `CreatePostBody.content` is a required string with `@maxLength 10000` and no explicit `minLength`. The Composer relaxes its existing `trimmed.length > 0` rule to `(trimmed.length > 0 \|\| items.length > 0)`. If the server rejects empty strings, we'll see a 400 from `createPost` during smoke test #12 and the fix is to either (a) require text after all, or (b) silently send a single space. We will discover the answer during the manual smoke and document the outcome inline in the plan.
- **`updateComment` length cap.** Generated `UpdateCommentBody.content` has no `maxLength` annotation. We will not impose one client-side either (matches the existing `CreateCommentBody` / `CommentComposer` behavior). If the server validates a cap, the resulting 400 toasts cleanly via the existing error handler.
- **XHR vs fetch.** Using `XMLHttpRequest` for R2 PUT is a deliberate departure from the codebase's `ky`/`fetch` preference, justified by the need for `upload.onprogress`. This is the only XHR usage in the codebase; `upload-to-r2.ts` is small and self-contained.
- **Reorder UX on touch devices.** Hand-rolled `pointerdown/move/up` works on touch in principle. On iOS Safari, the long-press may conflict with system gestures (text selection, image preview). If smoke testing surfaces this, fall back to a "no reorder on touch" branch (detect `pointerType === 'touch'` and disable the drag handlers).
- **`PostOwnerMenu` absolute placement.** The trigger is absolute-positioned at the post header's top-right. The header is already a flex row that grows with content; the menu trigger must not overlap with very long author names. If overlap is observed, switch to `ml-auto` on a flex item rather than absolute positioning.
- **Avatar non-optimistic flash.** Between user-pick and `commitAvatar` success (potentially 1-3 seconds), the old avatar still renders with a spinner overlay. If this feels too slow, a future polish step could optimistically render the local object URL during the upload, then swap to the server URL on commit — but it must handle the moment of object-URL revocation carefully.
- **Orphan R2 objects.** Failure paths (createPost fails, slot removed mid-upload, avatar commit fails after PUT) leave R2 objects unowned. Backend TTL is the cleanup mechanism. No frontend action.
- **`useCommitAvatar` writing `useAuthStore`.** The mutation hook directly touches the auth store. This is a deliberate cross-feature dependency (matching Phase D's `useFriendshipStatus` reading from the store) and acceptable because the auth store is the singleton source of truth for current-user data. Alternative — surfacing a callback to the call site — adds boilerplate without locality benefit.
- **No tests is the biggest risk.** The pure helpers (`upload-to-r2`, `read-image-dimensions`, `feed-cache.ts` additions) and especially the stateful `use-composer-image-uploads` (state machine) are exactly the kind of code that benefits from vitest. If a regression bites Phase E, the first response is to retrofit unit tests for those modules.
- **`<PostCard>` re-renders on every cache patch.** The new optimistic mutations (visibility flip, delete, comment edit, comment delete) all fan out over multiple post-list caches. The existing Phase D cache fan-out has proven acceptable in practice; if visible jank appears, narrow the fan-out to only the caches a given post is in (already supported by `patchPostInPages`'s `exists` short-circuit).
- **`AlertDialog` keyboard behavior.** shadcn's `AlertDialog` traps focus and binds Esc to cancel by default. We rely on these defaults and do not customize keyboard handling.

## Testing Strategy

Manual smoke gate run against `pnpm dev` (port 3000) with the backend on `http://localhost:8787`. Test fixtures:

- **Two test users** A (logged-in viewer) and B (someone else).
- **Image set:** at least one JPEG, one PNG, one WEBP, one GIF (invalid type), one ≥ 10 MB JPEG (invalid size for posts), one ≥ 5 MB JPEG (invalid size for avatar), one image with extreme aspect ratio (e.g., 200×3000).
- DevTools Network tab open to verify presign batching and parallel PUTs.

A failure on any item means fixing it before the phase is declared done.

1. **Phase D regression.** Cold-load `/` → `/friends` → `/friend-requests` → `/users/<B>`. Sidebars live. Send friend request, accept, unfriend.
2. **Phase C regression.** Compose text-only post → appears at top. Like, comment.
3. **Compose 1 jpeg.** Pick → thumb appears → progress bar fills → `done` → Post → grid renders single image full-width.
4. **Compose 4 mixed-type.** Pick one of each (jpeg/png/webp) + a 4th → 4 thumbs, 4 parallel PUTs in Network tab, batched presign call → all done → Post → 2×2 grid.
5. **Try 5+ images.** Pick 5 at once → 4 accepted, 5th rejected with `toast.info('Max 4 images per post')`. Pick 2 more atop 3 → 1 accepted, 1 rejected.
6. **Reject by type.** Pick a `.gif` → rejected with toast.info; no slot added.
7. **Reject by size.** Pick a 12 MB jpeg → rejected with toast.info; no slot added.
8. **Remove during upload.** Pick 4, immediately click X on slot #2 mid-upload → slot disappears; the in-flight PUT for that slot is canceled in Network tab.
9. **Reorder.** Pick 3, drag slot 3 to position 1 → preview order updates. Post → server returns images in the new `position` order → grid matches the new order.
10. **Retry failed slot.** With DevTools "offline" toggled, pick 1 → slot errors. Toggle online, click the retry icon → slot re-presigns and re-uploads, ends at `done`.
11. **Post fails after upload.** Kill the backend POST `/posts` route (e.g., `Throttling: Offline` after uploads complete, then click Post) → toast.error, composer state preserved.
12. **Image-only post.** Leave text empty, pick 1 image → Post button enables → click Post → if 400, document and switch the rule to require text; if 2xx, post renders with empty content.
13. **Submit while uploading.** Pick 4, click Post mid-upload → button is disabled (no-op).
14. **Reset on success.** Successful post → composer clears (text empty, no thumbs, visibility back to Public).
15. **Lightbox open + cycle.** Click image in a 4-grid → lightbox opens at clicked index. ArrowRight cycles through 0→1→2→3→0. ArrowLeft cycles the other way. Esc closes. Focus returns to clicked image after close.
16. **Lightbox accessibility.** Tab inside the lightbox cycles between prev/next/close without escaping.
17. **Lightbox single image.** Post with 1 image → click → lightbox opens, prev/next chevrons hidden.
18. **Visibility selector default.** Composer initial state: pill reads "Public".
19. **Compose private post.** Switch pill to "Private" → Post → reload → post still in own feed.
20. **Visibility resets after post.** After success, pill flips back to "Public" automatically.
21. **Owner menu visible on own posts only.** Scroll feed; ellipsis appears only on posts where author === me.
22. **Owner menu — flip to private.** Click `…` → "Make private" → no confirm, menu closes, next open shows "Make public". Refresh confirms server stored the flip.
23. **Owner menu — delete cancel.** Click `…` → "Delete post" → AlertDialog → Cancel → dialog closes, post unchanged.
24. **Owner menu — delete confirm.** Same flow but click Delete → post disappears from feed instantly. Refresh → still gone.
25. **Owner menu — delete failure.** With backend killed: confirm Delete → post disappears then snaps back after ~100ms + toast.error.
26. **Comment edit happy path.** On own comment under any post: hover → ellipsis appears → click → Edit → textarea swaps in with current content → modify → Save → row re-renders with new content. Refresh confirms.
27. **Comment edit cancel.** Same flow but click Cancel → row reverts; no mutation in network.
28. **Comment edit Esc.** Edit → press Esc → row reverts.
29. **Comment edit empty.** Edit → clear → Save is disabled.
30. **Comment edit failure.** With backend down → Save → row reverts after ~100ms + toast.error; edit mode stays open for retry.
31. **Comment delete.** Ellipsis → Delete → AlertDialog → Confirm → comment row disappears AND the post's comment-count counter ticks down by 1 across every mounted `PostCard`.
32. **Comment delete cancel.** AlertDialog → Cancel → nothing changes.
33. **Comment delete failure.** Same as 31 but backend down → row snaps back + count restores + toast.error.
34. **Comment owner menu visibility (md+).** Resize to ≥ `md`. Ellipsis invisible until row hover or focus.
35. **Comment owner menu visibility (< md).** Resize to mobile width. Ellipsis always visible on own comments.
36. **No menus on others' content.** Other users' posts and their comments under your posts: no ellipsis present.
37. **Profile name edit happy path.** On `/users/<me>`: pencil → inline inputs → change last name → Save → header updates instantly, sidebar `AvatarMenu` greeting updates. Refresh confirms server stored it.
38. **Profile name edit Esc.** Esc → inputs revert.
39. **Profile name edit empty.** Empty either input → Save disabled.
40. **Profile name edit failure.** Backend down → Save → header reverts after ~100ms + toast.error; inputs stay open.
41. **Avatar upload happy path.** Camera button → pick image → spinner overlays avatar → 1-2s later avatar URL updates everywhere current-user avatar is mounted (header, sidebar, AvatarMenu).
42. **Avatar upload type reject.** Pick a `.gif` → rejected with toast.info, no spinner, no calls.
43. **Avatar upload size reject.** Pick a 6 MB jpeg → rejected with toast.info.
44. **Avatar upload commit failure.** Backend down during commit → spinner clears, toast.error, old avatar stays.
45. **No edit affordances on other-user profile.** Visit `/users/<B>`: no camera overlay, no pencil button.
46. **Cross-mount sync.** Open `/` in tab 1 and `/users/<me>` in tab 2 (same session). Edit name in tab 2 → switch to tab 1 → composer header / sidebar should NOT reflect the change (no cross-tab broadcast in scope). Refresh tab 1 → change appears (server fetch).
47. **Dark mode.** Toggle dark theme; all new surfaces render with adequate contrast: composer strip thumb borders, progress bar, image grid, lightbox, dropdowns, alert dialogs, inline edit inputs, camera overlay.
48. **`pnpm typecheck`** exits 0.
49. **`pnpm lint`** exits 0 with no warnings.
50. **`git status`** clean after the final commit.

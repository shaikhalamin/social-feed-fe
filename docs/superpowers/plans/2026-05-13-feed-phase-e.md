# Feed (Phase E) — Media & Ownership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every Phase A–D gap that has a backend endpoint but no UI: post-image upload (presign → R2 PUT → commit), avatar upload, profile name edit, post visibility flip + delete, comment edit + delete, composer visibility selector, image grid + lightbox.

**Architecture:** A stateful `useComposerImageUploads` hook owns a per-slot state machine (`reading → pending → presigning → uploading → done`/`error`) driven by two pure helpers (`uploadToR2` via `XMLHttpRequest`, `readImageDimensions` via object URL + `<img>`). Five new mutation hooks reuse Phase C/D cache fan-out (`patchAllPostListCaches`, `restorePostListCaches`) and add `removePostFromAllPostListCaches` + `patchCommentInList` + `removeCommentFromList`. Avatar commit is non-optimistic; everything else is optimistic with rollback on error. Two new shadcn primitives — `Dialog` (lightbox) and `AlertDialog` (destructive confirms).

**Tech Stack:** React 19, TanStack Query 5 (`useMutation` + `setQueryData` + `InfiniteData`), TanStack Router (no new routes), Tailwind v4, shadcn primitives (`Dialog`, `AlertDialog`, `DropdownMenu`, `Button`, `Avatar`, `Separator`), `lucide-react` icons, `sonner` toasts, Zustand (`useAuthStore`), Kubb-generated clients / hooks / types under `src/gen/api/`. Native `XMLHttpRequest` for R2 PUT progress.

**Spec:** `docs/superpowers/specs/2026-05-13-feed-phase-e-design.md`

**Testing note (deviation from default writing-plans):** Per the approved spec (§Non-Goals and §Testing Strategy), Phase E is gated by a manual smoke checklist instead of unit tests — consistent with Phases A / B / C / D. The final task runs the spec's 50-item smoke gate. `pnpm typecheck` and `pnpm lint` exit 0 after every commit.

---

## File Map

**Created:**
- `src/components/ui/dialog.tsx` — shadcn `Dialog` primitive (added via `pnpm dlx shadcn@latest add dialog`).
- `src/components/ui/alert-dialog.tsx` — shadcn `AlertDialog` primitive (added via `pnpm dlx shadcn@latest add alert-dialog`).
- `src/features/media/upload-to-r2.ts` — `XMLHttpRequest`-based PUT with progress + abort signal.
- `src/features/media/read-image-dimensions.ts` — object URL + `<img>` natural-dimensions reader.
- `src/features/media/use-presign-post-uploads.ts` — thin wrapper over generated `usePresignPostUploads`.
- `src/features/media/use-presign-avatar.ts` — thin wrapper over generated `usePresignAvatar`.
- `src/features/media/use-commit-avatar.ts` — wrapper over generated `useCommitAvatar` that writes `useAuthStore` + `setQueryData(['user', id])` on success.
- `src/features/media/use-composer-image-uploads.ts` — stateful orchestrator hook owning the slot state machine.
- `src/features/feed/use-delete-post.ts` — optimistic delete via `removePostFromAllPostListCaches`.
- `src/features/feed/use-update-post-visibility.ts` — optimistic visibility flip via `patchAllPostListCaches`.
- `src/features/feed/use-update-comment.ts` — optimistic content patch on `['comments', postId, 'infinite']`.
- `src/features/feed/use-delete-comment.ts` — optimistic remove from comments cache + comment-counter decrement on post-list caches.
- `src/features/profile/use-update-user.ts` — optimistic first/last name update on `useAuthStore` + `['user', id]` cache.
- `src/components/feed/PostOwnerMenu.tsx` — three-dot menu on own posts (visibility flip + delete).
- `src/components/feed/CommentOwnerMenu.tsx` — three-dot menu on own comments (edit + delete).
- `src/components/feed/ComposerImageStrip.tsx` — horizontal thumb strip with progress / error / remove / reorder.
- `src/components/feed/ComposerVisibilitySelector.tsx` — pill `DropdownMenu` toggling `'public'` ↔ `'private'`.
- `src/components/feed/PostImageGrid.tsx` — 1/2/3/4 adaptive grid; clicking opens lightbox.
- `src/components/feed/PostImageLightbox.tsx` — `Dialog`-based lightbox with prev/next + ArrowLeft/Right/Esc.

**Modified:**
- `src/features/feed/feed-cache.ts` — add `removePostFromPages`, `removePostFromAllPostListCaches`, `CommentPages` alias, `patchCommentInList`, `removeCommentFromList`. No other exports change.
- `src/components/feed/Composer.tsx` — wire `useComposerImageUploads`, hidden file input, `ComposerImageStrip`, `ComposerVisibilitySelector`, expanded `canSubmit` gate, pass `images` + `visibility` to `createPost`, reset on success.
- `src/components/feed/PostCard.tsx` — render `<PostImageGrid>` between content `<p>` and `PostCardCounters` when `post.images.length > 0`; render `<PostOwnerMenu>` in the header.
- `src/components/feed/CommentRow.tsx` — add `group` class to root, swap text for `<textarea>` + Save / Cancel when `isEditing`, render `<CommentOwnerMenu>` on hover/focus on owner rows; accept `postId` prop.
- `src/components/feed/CommentList.tsx` — pass `postId` through to `CommentRow`.
- `src/components/friends/ProfileHeader.tsx` — when `user.id === currentUser?.id`: camera-icon overlay button + hidden file input wiring avatar upload (presign → PUT → commit, non-optimistic with spinner); pencil-icon button beside the name; inline first / last name inputs + Save / Cancel.

**Untouched:**
- Phase A auth, Phase B shell, Phase C/D end-user logic for friends / sidebar / feed rendering.
- `src/gen/api/**` (regenerated, never hand-edited — already contains every endpoint we call).
- All other routes and components.

---

## Conventions

- **No semicolons, single quotes, trailing commas.** Match Phase C / D style in surrounding files.
- **Imports use `.ts` extensions** for files under `@/gen/api/`. Internal feature modules omit the extension where Phase C/D does — match each directory's existing style.
- **`import type`** for any type-only import (required by `verbatimModuleSyntax`).
- **No `any`, no `as any`, no `!`, no eslint/ts disable** (per CLAUDE.md). Narrow with `instanceof`, `in`, or type guards.
- **No inline `import()`.** All imports are top-of-file static `import` / `import type`.
- **Toast import:** `import { toast } from '@/components/ui/sonner'`. Failure → `toast.error("Couldn't …")`; cap / reject → `toast.info('…')`; **no success toasts**.
- **Per-file `userInitials` / `authorInitials` helper** (not shared) — matches the existing Phase C/D pattern.
- **Optimistic-mutation protocol** (mirror Phase C/D exactly):
  1. `await queryClient.cancelQueries({ queryKey })` for each affected key (`commentsQueryKey(postId)` and/or `cancelPostListQueries(queryClient)`).
  2. Snapshot via `queryClient.getQueryData(...)` and/or `snapshotPostListCaches(queryClient)`.
  3. Patch through the pure helper in `feed-cache.ts`.
  4. Return a `context` containing each snapshot.
  5. `onError`: restore each snapshot, then `toast.error(...)`.
  6. **No `onSettled` refetch.**
- **`AlertDialog` confirmations** for destructive actions (post delete, comment delete) only. Visibility flip uses no confirm.
- **Hidden file-input pattern:** `useRef<HTMLInputElement>(null)` + `<input type="file" className="hidden" />`; user-visible button calls `inputRef.current?.click()`; `onChange` reads `e.target.files`, calls handler, then `e.target.value = ''` so re-picking the same file fires `change` again.

---

## Task 1: Add shadcn `Dialog` primitive

**Files:**
- Create: `src/components/ui/dialog.tsx` (generated)

- [ ] **Step 1: Run shadcn add**

```bash
pnpm dlx shadcn@latest add dialog
```

Expected: prints "Created file" for `src/components/ui/dialog.tsx`. If `@radix-ui/react-dialog` is not yet installed, the command adds it.

- [ ] **Step 2: Sanity-check the file**

Read `src/components/ui/dialog.tsx`. Confirm it exports `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`. The file is generated — do not hand-edit beyond formatting.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/dialog.tsx pnpm-lock.yaml package.json
git commit -m "chore(ui): add shadcn Dialog primitive for Phase E lightbox"
```

---

## Task 2: Add shadcn `AlertDialog` primitive

**Files:**
- Create: `src/components/ui/alert-dialog.tsx` (generated)

- [ ] **Step 1: Run shadcn add**

```bash
pnpm dlx shadcn@latest add alert-dialog
```

Expected: prints "Created file" for `src/components/ui/alert-dialog.tsx`. Adds `@radix-ui/react-alert-dialog` if missing.

- [ ] **Step 2: Sanity-check the file**

Read `src/components/ui/alert-dialog.tsx`. Confirm it exports `AlertDialog`, `AlertDialogTrigger`, `AlertDialogPortal`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/alert-dialog.tsx pnpm-lock.yaml package.json
git commit -m "chore(ui): add shadcn AlertDialog primitive for Phase E destructive confirms"
```

---

## Task 3: Extend `feed-cache.ts` with post-delete + comment helpers

**Files:**
- Modify: `src/features/feed/feed-cache.ts`

- [ ] **Step 1: Add imports for comment shape at the top**

At the top of `src/features/feed/feed-cache.ts`, add (alongside existing imports):

```ts
import type { Comment } from '@/gen/api/types/Comment.ts'
import type { ListCommentsQueryResponse } from '@/gen/api/types/ListComments.ts'
```

- [ ] **Step 2: Append `removePostFromPages`, `removePostFromAllPostListCaches`, and comment-cache helpers**

Append to the bottom of `src/features/feed/feed-cache.ts`:

```ts
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
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/features/feed/feed-cache.ts
git commit -m "feat(feed): add removePostFromPages + comment cache helpers for Phase E"
```

---

## Task 4: Add `useDeletePostMutation`

**Files:**
- Create: `src/features/feed/use-delete-post.ts`

- [ ] **Step 1: Write `src/features/feed/use-delete-post.ts`**

```ts
import { useDeletePost } from '@/gen/api/hooks/useDeletePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { PostListSnapshot } from './feed-cache'
import {
  cancelPostListQueries,
  removePostFromAllPostListCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type DeletePostContext = { snapshot: PostListSnapshot }

export function useDeletePostMutation() {
  return useDeletePost<DeletePostContext>({
    mutation: {
      onMutate: async ({ id }) => {
        await cancelPostListQueries(queryClient)
        const snapshot = snapshotPostListCaches(queryClient)
        removePostFromAllPostListCaches(queryClient, id)
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
        toast.error("Couldn't delete post")
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
git add src/features/feed/use-delete-post.ts
git commit -m "feat(feed): add useDeletePostMutation with optimistic removal"
```

---

## Task 5: Add `useUpdatePostVisibilityMutation`

**Files:**
- Create: `src/features/feed/use-update-post-visibility.ts`

- [ ] **Step 1: Write `src/features/feed/use-update-post-visibility.ts`**

```ts
import { useUpdatePostVisibility } from '@/gen/api/hooks/useUpdatePostVisibility.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { PostListSnapshot } from './feed-cache'
import {
  cancelPostListQueries,
  patchAllPostListCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type VisibilityContext = { snapshot: PostListSnapshot }

export function useUpdatePostVisibilityMutation() {
  return useUpdatePostVisibility<VisibilityContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        await cancelPostListQueries(queryClient)
        const snapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, id, (p) => ({
          ...p,
          visibility: data.visibility,
        }))
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
        toast.error("Couldn't update visibility")
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
git add src/features/feed/use-update-post-visibility.ts
git commit -m "feat(feed): add useUpdatePostVisibilityMutation with optimistic flip"
```

---

## Task 6: Add `useUpdateCommentMutation`

**Files:**
- Create: `src/features/feed/use-update-comment.ts`

- [ ] **Step 1: Write `src/features/feed/use-update-comment.ts`**

```ts
import { useUpdateComment } from '@/gen/api/hooks/useUpdateComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { commentsQueryKey } from './use-post-comments'
import type { CommentPages } from './feed-cache'
import { patchCommentInList } from './feed-cache'

type UpdateCommentContext = { previous: CommentPages | undefined }

export function useUpdateCommentMutation(postId: string) {
  return useUpdateComment<UpdateCommentContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        const key = commentsQueryKey(postId)
        await queryClient.cancelQueries({ queryKey: key })
        const previous = queryClient.getQueryData<CommentPages>(key)
        const nowIso = new Date().toISOString()
        queryClient.setQueryData<CommentPages>(key, (pages) =>
          patchCommentInList(pages, id, (c) => ({
            ...c,
            content: data.content,
            isEdited: true,
            updatedAt: nowIso,
          })),
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<CommentPages>(
            commentsQueryKey(postId),
            context.previous,
          )
        }
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
git commit -m "feat(feed): add useUpdateCommentMutation with optimistic patch"
```

---

## Task 7: Add `useDeleteCommentMutation`

**Files:**
- Create: `src/features/feed/use-delete-comment.ts`

- [ ] **Step 1: Write `src/features/feed/use-delete-comment.ts`**

```ts
import { useDeleteComment } from '@/gen/api/hooks/useDeleteComment.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { commentsQueryKey } from './use-post-comments'
import type { CommentPages, PostListSnapshot } from './feed-cache'
import {
  cancelPostListQueries,
  patchAllPostListCaches,
  removeCommentFromList,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type DeleteCommentContext = {
  previousComments: CommentPages | undefined
  postListSnapshot: PostListSnapshot
}

export function useDeleteCommentMutation(postId: string) {
  return useDeleteComment<DeleteCommentContext>({
    mutation: {
      onMutate: async ({ id }) => {
        const commentsKey = commentsQueryKey(postId)
        await Promise.all([
          queryClient.cancelQueries({ queryKey: commentsKey }),
          cancelPostListQueries(queryClient),
        ])
        const previousComments =
          queryClient.getQueryData<CommentPages>(commentsKey)
        const postListSnapshot = snapshotPostListCaches(queryClient)
        queryClient.setQueryData<CommentPages>(commentsKey, (pages) =>
          removeCommentFromList(pages, id),
        )
        patchAllPostListCaches(queryClient, postId, (p) => ({
          ...p,
          counters: {
            ...p.counters,
            comments: Math.max(0, p.counters.comments - 1),
          },
        }))
        return { previousComments, postListSnapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<CommentPages>(
            commentsQueryKey(postId),
            context.previousComments,
          )
          restorePostListCaches(queryClient, context.postListSnapshot)
        }
        toast.error("Couldn't delete comment")
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
git add src/features/feed/use-delete-comment.ts
git commit -m "feat(feed): add useDeleteCommentMutation with cache fan-out"
```

---

## Task 8: Add `useUpdateUserMutation`

**Files:**
- Create: `src/features/profile/use-update-user.ts`

- [ ] **Step 1: Write `src/features/profile/use-update-user.ts`**

```ts
import { useUpdateUser } from '@/gen/api/hooks/useUpdateUser.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { userQueryKey } from '@/features/friends/use-user'
import type { AuthUser } from '@/hooks/use-auth'
import type { GetUserQueryResponse } from '@/gen/api/types/GetUser.ts'

type UpdateUserContext = {
  previousAuthUser: AuthUser | null
  previousUserQuery: GetUserQueryResponse | undefined
  isSelf: boolean
}

export function useUpdateUserMutation() {
  return useUpdateUser<UpdateUserContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        const key = userQueryKey(id)
        await queryClient.cancelQueries({ queryKey: key })
        const previousAuthUser = useAuthStore.getState().user
        const previousUserQuery =
          queryClient.getQueryData<GetUserQueryResponse>(key)
        const isSelf = previousAuthUser?.id === id
        const nowIso = new Date().toISOString()
        if (isSelf && previousAuthUser) {
          useAuthStore.getState().setUser({
            ...previousAuthUser,
            firstName: data.firstName ?? previousAuthUser.firstName,
            lastName: data.lastName ?? previousAuthUser.lastName,
            updatedAt: nowIso,
          })
        }
        if (previousUserQuery) {
          queryClient.setQueryData<GetUserQueryResponse>(key, {
            ...previousUserQuery,
            data: {
              ...previousUserQuery.data,
              firstName: data.firstName ?? previousUserQuery.data.firstName,
              lastName: data.lastName ?? previousUserQuery.data.lastName,
              updatedAt: nowIso,
            },
          })
        }
        return { previousAuthUser, previousUserQuery, isSelf }
      },
      onSuccess: (response, _vars, context) => {
        if (context.isSelf) {
          useAuthStore.getState().setUser(response.data)
        }
        queryClient.setQueryData<GetUserQueryResponse>(
          userQueryKey(response.data.id),
          response,
        )
      },
      onError: (_err, vars, context) => {
        if (!context) {
          toast.error("Couldn't update profile")
          return
        }
        if (context.isSelf) {
          useAuthStore.getState().setUser(context.previousAuthUser)
        }
        queryClient.setQueryData<GetUserQueryResponse>(
          userQueryKey(vars.id),
          context.previousUserQuery,
        )
        toast.error("Couldn't update profile")
      },
    },
  })
}
```

- [ ] **Step 2: Verify directory exists**

Run: `ls src/features/profile 2>/dev/null || mkdir -p src/features/profile`
Expected: directory exists for the file path used above.

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`. If `userQueryKey` is not exported from `@/features/friends/use-user`, confirm by reading the file — it already exports `userQueryKey` per the existing Phase D wiring.

- [ ] **Step 4: Commit**

```bash
git add src/features/profile/use-update-user.ts
git commit -m "feat(profile): add useUpdateUserMutation with optimistic auth+cache update"
```

---

## Task 9: Add `uploadToR2` helper

**Files:**
- Create: `src/features/media/upload-to-r2.ts`

- [ ] **Step 1: Verify directory exists**

Run: `mkdir -p src/features/media`

- [ ] **Step 2: Write `src/features/media/upload-to-r2.ts`**

```ts
export type UploadProgress = (loaded: number, total: number) => void

export function uploadToR2(
  uploadUrl: string,
  file: File,
  contentType: string,
  signal?: AbortSignal,
  onProgress?: UploadProgress,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload aborted', 'AbortError'))
      return
    }
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', uploadUrl, true)
    xhr.setRequestHeader('Content-Type', contentType)
    if (onProgress) {
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) onProgress(evt.loaded, evt.total)
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
        return
      }
      reject(new Error(`R2 upload failed: HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('R2 upload failed: network error'))
    xhr.onabort = () =>
      reject(new DOMException('Upload aborted', 'AbortError'))
    const onAbort = () => {
      xhr.abort()
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    xhr.onloadend = () => {
      signal?.removeEventListener('abort', onAbort)
    }
    xhr.send(file)
  })
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/features/media/upload-to-r2.ts
git commit -m "feat(media): add uploadToR2 XHR helper with progress + abort"
```

---

## Task 10: Add `readImageDimensions` helper

**Files:**
- Create: `src/features/media/read-image-dimensions.ts`

- [ ] **Step 1: Write `src/features/media/read-image-dimensions.ts`**

```ts
export type ImageDimensions = { width: number; height: number }

export function readImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise<ImageDimensions>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const dims: ImageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
      }
      URL.revokeObjectURL(url)
      if (dims.width === 0 || dims.height === 0) {
        reject(new Error('Could not read image dimensions'))
        return
      }
      resolve(dims)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/features/media/read-image-dimensions.ts
git commit -m "feat(media): add readImageDimensions helper"
```

---

## Task 11: Add `usePresignPostUploadsMutation` wrapper

**Files:**
- Create: `src/features/media/use-presign-post-uploads.ts`

- [ ] **Step 1: Write `src/features/media/use-presign-post-uploads.ts`**

```ts
import { usePresignPostUploads } from '@/gen/api/hooks/usePresignPostUploads.ts'

export function usePresignPostUploadsMutation() {
  return usePresignPostUploads()
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/features/media/use-presign-post-uploads.ts
git commit -m "feat(media): add usePresignPostUploadsMutation wrapper"
```

---

## Task 12: Add `usePresignAvatarMutation` wrapper

**Files:**
- Create: `src/features/media/use-presign-avatar.ts`

- [ ] **Step 1: Write `src/features/media/use-presign-avatar.ts`**

```ts
import { usePresignAvatar } from '@/gen/api/hooks/usePresignAvatar.ts'

export function usePresignAvatarMutation() {
  return usePresignAvatar()
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/features/media/use-presign-avatar.ts
git commit -m "feat(media): add usePresignAvatarMutation wrapper"
```

---

## Task 13: Add `useCommitAvatarMutation`

**Files:**
- Create: `src/features/media/use-commit-avatar.ts`

The hook only handles the success-path cache write. Error toasting is delegated to the caller (`ProfileHeader.onPickAvatar`) so that presign / upload / commit failures all surface a single toast.

- [ ] **Step 1: Write `src/features/media/use-commit-avatar.ts`**

```ts
import { useCommitAvatar } from '@/gen/api/hooks/useCommitAvatar.ts'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/hooks/use-auth'
import { userQueryKey } from '@/features/friends/use-user'
import type { GetUserQueryResponse } from '@/gen/api/types/GetUser.ts'

export function useCommitAvatarMutation() {
  return useCommitAvatar({
    mutation: {
      onSuccess: (response, vars) => {
        const user = response.data
        const me = useAuthStore.getState().user
        if (me?.id === vars.id) {
          useAuthStore.getState().setUser(user)
        }
        queryClient.setQueryData<GetUserQueryResponse>(userQueryKey(vars.id), {
          data: user,
        })
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
git add src/features/media/use-commit-avatar.ts
git commit -m "feat(media): add useCommitAvatarMutation that fans out to auth+cache"
```

---

## Task 14: Add `useComposerImageUploads` orchestrator (state machine + handlers)

**Files:**
- Create: `src/features/media/use-composer-image-uploads.ts`

This is the largest module in Phase E. It owns a `Map<localId, ImageUploadState>` state machine and exposes a stable `add / remove / retry / reorder / reset` surface. We build it in one task because every step is interdependent.

- [ ] **Step 1: Write `src/features/media/use-composer-image-uploads.ts`**

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/sonner'
import type { CreatePostBody } from '@/gen/api/types/CreatePostBody.ts'
import type {
  PresignBody,
  PresignBodyContentTypesEnumKey,
} from '@/gen/api/types/PresignBody.ts'
import type { PresignEntry } from '@/gen/api/types/PresignEntry.ts'
import { readImageDimensions } from './read-image-dimensions'
import { uploadToR2 } from './upload-to-r2'
import { usePresignPostUploadsMutation } from './use-presign-post-uploads'

export const MAX_IMAGES_PER_POST = 4
export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_CONTENT_TYPES: ReadonlySet<PresignBodyContentTypesEnumKey> =
  new Set(['image/jpeg', 'image/png', 'image/webp'])

function isAllowedContentType(
  value: string,
): value is PresignBodyContentTypesEnumKey {
  return ALLOWED_CONTENT_TYPES.has(value as PresignBodyContentTypesEnumKey)
}

export type ImageUploadStatus =
  | 'reading'
  | 'pending'
  | 'uploading'
  | 'done'
  | 'error'

export type ImageUploadState = {
  localId: string
  file: File
  previewUrl: string
  contentType: PresignBodyContentTypesEnumKey
  status: ImageUploadStatus
  width?: number
  height?: number
  r2Key?: string
  uploadUrl?: string
  expiresAt?: string
  progress: number
  error?: string
}

type RequiredPostImage = NonNullable<CreatePostBody['images']>[number]

export type UseComposerImageUploads = {
  items: ImageUploadState[]
  add: (files: FileList | File[]) => void
  remove: (localId: string) => void
  retry: (localId: string) => void
  reorder: (fromIndex: number, toIndex: number) => void
  reset: () => void
  allDone: boolean
  anyPending: boolean
  postImages: RequiredPostImage[]
}

function nextLocalId(): string {
  return crypto.randomUUID()
}

export function useComposerImageUploads(): UseComposerImageUploads {
  const [items, setItems] = useState<ImageUploadState[]>([])
  const itemsRef = useRef<ImageUploadState[]>([])
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())
  const presign = usePresignPostUploadsMutation()

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      for (const it of itemsRef.current) URL.revokeObjectURL(it.previewUrl)
      for (const ctrl of abortControllersRef.current.values()) ctrl.abort()
    }
  }, [])

  const updateItem = useCallback(
    (localId: string, patch: Partial<ImageUploadState>) => {
      setItems((prev) =>
        prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
      )
    },
    [],
  )

  const startUploadForSlot = useCallback(
    (slot: ImageUploadState) => {
      if (!slot.uploadUrl) return
      if (!itemsRef.current.some((it) => it.localId === slot.localId)) {
        return
      }
      const ctrl = new AbortController()
      abortControllersRef.current.set(slot.localId, ctrl)
      updateItem(slot.localId, { status: 'uploading', progress: 0 })
      uploadToR2(
        slot.uploadUrl,
        slot.file,
        slot.contentType,
        ctrl.signal,
        (loaded, total) =>
          updateItem(slot.localId, {
            progress: total > 0 ? loaded / total : 0,
          }),
      )
        .then(() => {
          abortControllersRef.current.delete(slot.localId)
          updateItem(slot.localId, { status: 'done', progress: 1 })
        })
        .catch((err: unknown) => {
          abortControllersRef.current.delete(slot.localId)
          if (err instanceof DOMException && err.name === 'AbortError') return
          updateItem(slot.localId, {
            status: 'error',
            error: 'Upload failed',
          })
        })
    },
    [updateItem],
  )

  const presignAndUpload = useCallback(
    (slots: ImageUploadState[]) => {
      if (slots.length === 0) return
      const body: PresignBody = {
        count: slots.length,
        contentTypes: slots.map((s) => s.contentType),
      }
      presign.mutate(
        { data: body },
        {
          onSuccess: (response) => {
            const uploads: PresignEntry[] = response.data.uploads
            slots.forEach((slot, i) => {
              const entry = uploads[i]
              if (!entry) {
                updateItem(slot.localId, {
                  status: 'error',
                  error: 'Presign mismatch',
                })
                return
              }
              const next: ImageUploadState = {
                ...slot,
                r2Key: entry.r2Key,
                uploadUrl: entry.uploadUrl,
                expiresAt: entry.expiresAt,
              }
              updateItem(slot.localId, {
                r2Key: entry.r2Key,
                uploadUrl: entry.uploadUrl,
                expiresAt: entry.expiresAt,
              })
              startUploadForSlot(next)
            })
          },
          onError: () => {
            for (const slot of slots) {
              updateItem(slot.localId, {
                status: 'error',
                error: 'Presign failed',
              })
            }
            toast.error("Couldn't prepare upload")
          },
        },
      )
    },
    [presign, startUploadForSlot, updateItem],
  )

  const add = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files)
      const currentCount = itemsRef.current.length
      const capRemaining = Math.max(0, MAX_IMAGES_PER_POST - currentCount)
      if (capRemaining === 0) {
        toast.info(`Max ${MAX_IMAGES_PER_POST} images per post`)
        return
      }
      const overCap = incoming.length > capRemaining
      const limited = incoming.slice(0, capRemaining)
      const accepted: Array<{
        localId: string
        file: File
        contentType: PresignBodyContentTypesEnumKey
      }> = []
      let rejectedType = false
      let rejectedSize = false
      for (const file of limited) {
        if (!isAllowedContentType(file.type)) {
          rejectedType = true
          continue
        }
        if (file.size > POST_IMAGE_MAX_BYTES) {
          rejectedSize = true
          continue
        }
        accepted.push({
          localId: nextLocalId(),
          file,
          contentType: file.type,
        })
      }
      if (overCap) toast.info(`Max ${MAX_IMAGES_PER_POST} images per post`)
      if (rejectedType) toast.info('Only JPEG, PNG, or WEBP images allowed')
      if (rejectedSize) toast.info('Image must be 10 MB or smaller')
      if (accepted.length === 0) return

      const newSlots: ImageUploadState[] = accepted.map(
        ({ localId, file, contentType }) => ({
          localId,
          file,
          contentType,
          previewUrl: URL.createObjectURL(file),
          status: 'reading',
          progress: 0,
        }),
      )
      setItems((prev) => [...prev, ...newSlots])

      Promise.all(
        newSlots.map((slot) =>
          readImageDimensions(slot.file).then(
            (dims) => ({ slot, dims, ok: true as const }),
            () => ({ slot, ok: false as const }),
          ),
        ),
      ).then((results) => {
        const readySlots: ImageUploadState[] = []
        for (const r of results) {
          if (!r.ok) {
            updateItem(r.slot.localId, {
              status: 'error',
              error: 'Could not read image',
            })
            continue
          }
          updateItem(r.slot.localId, {
            status: 'pending',
            width: r.dims.width,
            height: r.dims.height,
          })
          readySlots.push({
            ...r.slot,
            status: 'pending',
            width: r.dims.width,
            height: r.dims.height,
          })
        }
        presignAndUpload(readySlots)
      })
    },
    [presignAndUpload, updateItem],
  )

  const remove = useCallback((localId: string) => {
    const target = itemsRef.current.find((it) => it.localId === localId)
    if (target) URL.revokeObjectURL(target.previewUrl)
    const ctrl = abortControllersRef.current.get(localId)
    if (ctrl) {
      ctrl.abort()
      abortControllersRef.current.delete(localId)
    }
    setItems((prev) => prev.filter((it) => it.localId !== localId))
  }, [])

  const retry = useCallback(
    (localId: string) => {
      const slot = itemsRef.current.find((it) => it.localId === localId)
      if (!slot || slot.status !== 'error') return
      if (slot.width == null || slot.height == null) {
        updateItem(localId, { status: 'reading', error: undefined })
        readImageDimensions(slot.file).then(
          (dims) => {
            updateItem(localId, {
              status: 'pending',
              width: dims.width,
              height: dims.height,
            })
            presignAndUpload([
              { ...slot, status: 'pending', width: dims.width, height: dims.height },
            ])
          },
          () =>
            updateItem(localId, {
              status: 'error',
              error: 'Could not read image',
            }),
        )
        return
      }
      updateItem(localId, { status: 'pending', error: undefined })
      presignAndUpload([{ ...slot, status: 'pending' }])
    },
    [presignAndUpload, updateItem],
  )

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    setItems((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev
      }
      const next = prev.slice()
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    for (const it of itemsRef.current) URL.revokeObjectURL(it.previewUrl)
    for (const ctrl of abortControllersRef.current.values()) ctrl.abort()
    abortControllersRef.current.clear()
    setItems([])
  }, [])

  const allDone = useMemo(
    () => items.length > 0 && items.every((it) => it.status === 'done'),
    [items],
  )
  const anyPending = useMemo(
    () =>
      items.some(
        (it) =>
          it.status === 'reading' ||
          it.status === 'pending' ||
          it.status === 'uploading',
      ),
    [items],
  )
  const postImages = useMemo<RequiredPostImage[]>(
    () =>
      items
        .filter(
          (it): it is ImageUploadState & {
            r2Key: string
            width: number
            height: number
          } =>
            it.status === 'done' &&
            typeof it.r2Key === 'string' &&
            typeof it.width === 'number' &&
            typeof it.height === 'number',
        )
        .map((it, i) => ({
          r2Key: it.r2Key,
          width: it.width,
          height: it.height,
          position: i,
        })),
    [items],
  )

  return {
    items,
    add,
    remove,
    retry,
    reorder,
    reset,
    allDone,
    anyPending,
    postImages,
  }
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/features/media/use-composer-image-uploads.ts
git commit -m "feat(media): add useComposerImageUploads orchestrator"
```

---

## Task 15: Add `PostOwnerMenu`

**Files:**
- Create: `src/components/feed/PostOwnerMenu.tsx`

- [ ] **Step 1: Write `src/components/feed/PostOwnerMenu.tsx`**

```tsx
import { useState } from 'react'
import { Globe2, Lock, MoreHorizontal, Trash2 } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/hooks/use-auth'
import { useDeletePostMutation } from '@/features/feed/use-delete-post'
import { useUpdatePostVisibilityMutation } from '@/features/feed/use-update-post-visibility'
import type { Post } from '@/gen/api/types/Post.ts'

type Props = { post: Post }

export function PostOwnerMenu({ post }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const visibility = useUpdatePostVisibilityMutation()
  const remove = useDeletePostMutation()

  if (currentUserId !== post.author.id) return null

  const isPrivate = post.visibility === 'private'
  const flipTo = isPrivate ? 'public' : 'private'
  const flipLabel = isPrivate ? 'Make public' : 'Make private'
  const FlipIcon = isPrivate ? Globe2 : Lock

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Post actions"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={() => {
              visibility.mutate({
                id: post.id,
                data: { visibility: flipTo },
              })
            }}
          >
            <FlipIcon className="size-4" />
            {flipLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault()
              setConfirmOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                remove.mutate({ id: post.id })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostOwnerMenu.tsx
git commit -m "feat(feed): add PostOwnerMenu with visibility flip + delete"
```

---

## Task 16: Add `CommentOwnerMenu`

**Files:**
- Create: `src/components/feed/CommentOwnerMenu.tsx`

- [ ] **Step 1: Write `src/components/feed/CommentOwnerMenu.tsx`**

```tsx
import { useState } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/hooks/use-auth'
import { useDeleteCommentMutation } from '@/features/feed/use-delete-comment'
import type { Comment } from '@/gen/api/types/Comment.ts'

type Props = {
  comment: Comment
  postId: string
  onEdit: () => void
}

export function CommentOwnerMenu({ comment, postId, onEdit }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const remove = useDeleteCommentMutation(postId)

  if (currentUserId !== comment.author.id) return null

  return (
    <>
      <div className="md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Comment actions"
              className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onEdit()}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault()
                setConfirmOpen(true)
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false)
                remove.mutate({ id: comment.id })
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/CommentOwnerMenu.tsx
git commit -m "feat(feed): add CommentOwnerMenu with edit + delete"
```

---

## Task 17: Add `ComposerImageStrip`

**Files:**
- Create: `src/components/feed/ComposerImageStrip.tsx`

- [ ] **Step 1: Write `src/components/feed/ComposerImageStrip.tsx`**

```tsx
import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { Loader2, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImageUploadState } from '@/features/media/use-composer-image-uploads'

type Props = {
  items: ImageUploadState[]
  onRemove: (localId: string) => void
  onRetry: (localId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
}

const THUMB_WIDTH = 80
const SWAP_THRESHOLD = THUMB_WIDTH / 2

export function ComposerImageStrip({
  items,
  onRemove,
  onRetry,
  onReorder,
}: Props) {
  const dragRef = useRef<{
    fromIndex: number
    startX: number
    currentX: number
  } | null>(null)

  if (items.length === 0) return null

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>, index: number) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      fromIndex: index,
      startX: e.clientX,
      currentX: e.clientX,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return
    dragRef.current.currentX = e.clientX
  }

  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) {
      e.currentTarget.releasePointerCapture(e.pointerId)
      return
    }
    const { fromIndex, startX, currentX } = dragRef.current
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    const delta = currentX - startX
    if (Math.abs(delta) < SWAP_THRESHOLD) return
    const offset = Math.trunc(delta / SWAP_THRESHOLD)
    const toIndex = Math.max(0, Math.min(items.length - 1, fromIndex + offset))
    if (toIndex !== fromIndex) onReorder(fromIndex, toIndex)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => {
        const progressPct = Math.round(it.progress * 100)
        return (
          <div
            key={it.localId}
            className="group relative size-20 overflow-hidden rounded-md border bg-muted"
          >
            <button
              type="button"
              draggable={false}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="block size-full cursor-grab touch-none active:cursor-grabbing"
              aria-label={`Image ${i + 1}`}
            >
              <img
                src={it.previewUrl}
                alt=""
                className="size-full object-cover"
                draggable={false}
              />
            </button>

            {it.status === 'reading' ||
            it.status === 'pending' ||
            it.status === 'uploading' ? (
              <div className="pointer-events-none absolute inset-0 flex items-end bg-black/40">
                <div className="h-1 w-full bg-white/30">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-white" />
              </div>
            ) : null}

            {it.status === 'error' ? (
              <button
                type="button"
                onClick={() => onRetry(it.localId)}
                aria-label="Retry upload"
                className={cn(
                  'absolute inset-0 flex items-center justify-center bg-destructive/70 text-destructive-foreground',
                )}
              >
                <RotateCcw className="size-5" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onRemove(it.localId)}
              aria-label="Remove image"
              className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/ComposerImageStrip.tsx
git commit -m "feat(feed): add ComposerImageStrip with thumbs, progress, retry, reorder"
```

---

## Task 18: Add `ComposerVisibilitySelector`

**Files:**
- Create: `src/components/feed/ComposerVisibilitySelector.tsx`

- [ ] **Step 1: Write `src/components/feed/ComposerVisibilitySelector.tsx`**

```tsx
import { ChevronDown, Globe2, Lock } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CreatePostBodyVisibilityEnumKey } from '@/gen/api/types/CreatePostBody.ts'

type Props = {
  value: CreatePostBodyVisibilityEnumKey
  onChange: (next: CreatePostBodyVisibilityEnumKey) => void
  disabled?: boolean
}

export function ComposerVisibilitySelector({
  value,
  onChange,
  disabled,
}: Props) {
  const Icon = value === 'public' ? Globe2 : Lock
  const label = value === 'public' ? 'Public' : 'Private'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
          aria-label={`Visibility: ${label}`}
        >
          <Icon className="size-3.5" />
          <span>{label}</span>
          <ChevronDown className="size-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) =>
            onChange(v === 'private' ? 'private' : 'public')
          }
        >
          <DropdownMenuRadioItem value="public">
            <Globe2 className="size-4" />
            Public
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="private">
            <Lock className="size-4" />
            Private
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/ComposerVisibilitySelector.tsx
git commit -m "feat(feed): add ComposerVisibilitySelector pill"
```

---

## Task 19: Add `PostImageLightbox`

**Files:**
- Create: `src/components/feed/PostImageLightbox.tsx`

- [ ] **Step 1: Write `src/components/feed/PostImageLightbox.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PostImage } from '@/gen/api/types/PostImage.ts'

type Props = {
  images: PostImage[]
  initialIndex: number
  open: boolean
  onOpenChange: (next: boolean) => void
}

export function PostImageLightbox({
  images,
  initialIndex,
  open,
  onOpenChange,
}: Props) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length)
  }, [images.length])

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length)
  }, [images.length])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    }
  }

  if (images.length === 0) return null
  const current = images[Math.min(index, images.length - 1)]
  const multi = images.length > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={onKeyDown}
        className="max-w-[95vw] border-none bg-transparent p-0 shadow-none sm:max-w-[95vw]"
      >
        <DialogTitle className="sr-only">Image viewer</DialogTitle>
        <div className="relative flex items-center justify-center">
          <img
            src={current.url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          {multi ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-2 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-2 inline-flex size-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostImageLightbox.tsx
git commit -m "feat(feed): add PostImageLightbox dialog"
```

---

## Task 20: Add `PostImageGrid`

**Files:**
- Create: `src/components/feed/PostImageGrid.tsx`

- [ ] **Step 1: Write `src/components/feed/PostImageGrid.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { PostImage } from '@/gen/api/types/PostImage.ts'
import { PostImageLightbox } from './PostImageLightbox'

type Props = { images: PostImage[] }

function sortByPosition(images: PostImage[]): PostImage[] {
  return images.slice().sort((a, b) => a.position - b.position)
}

export function PostImageGrid({ images }: Props) {
  const ordered = useMemo(() => sortByPosition(images), [images])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  if (ordered.length === 0) return null

  const openAt = (i: number) => {
    setActiveIndex(i)
    setOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          'grid gap-1 overflow-hidden rounded-md',
          ordered.length === 1 && 'grid-cols-1',
          ordered.length === 2 && 'grid-cols-2',
          ordered.length === 3 && 'grid-cols-2 grid-rows-2',
          ordered.length >= 4 && 'grid-cols-2 grid-rows-2',
        )}
      >
        {ordered.map((img, i) => {
          const isThreeFirst = ordered.length === 3 && i === 0
          return (
            <button
              key={img.url}
              type="button"
              onClick={() => openAt(i)}
              className={cn(
                'group relative block overflow-hidden bg-muted',
                ordered.length === 1 && 'aspect-[16/9]',
                ordered.length === 2 && 'aspect-square',
                ordered.length === 3 && 'aspect-square',
                ordered.length === 3 && i === 0 && 'row-span-2 aspect-auto',
                ordered.length >= 4 && 'aspect-square',
              )}
              aria-label={`View image ${i + 1}`}
            >
              <img
                src={img.url}
                alt=""
                className={cn(
                  'size-full transition group-hover:scale-[1.02]',
                  ordered.length === 1 ? 'object-cover' : 'object-cover',
                  isThreeFirst && 'object-cover',
                )}
              />
            </button>
          )
        })}
      </div>
      <PostImageLightbox
        images={ordered}
        initialIndex={activeIndex}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostImageGrid.tsx
git commit -m "feat(feed): add PostImageGrid with adaptive layout"
```

---

## Task 21: Render grid + owner menu in `PostCard`

**Files:**
- Modify: `src/components/feed/PostCard.tsx`

- [ ] **Step 1: Replace the whole file with this content**

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
import { PostImageGrid } from './PostImageGrid'
import { PostOwnerMenu } from './PostOwnerMenu'

function authorInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
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
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{fullName}</div>
          <div className="text-xs text-muted-foreground">
            {formatTimeAgo(post.createdAt)}
          </div>
        </div>
        <PostOwnerMenu post={post} />
      </div>

      {post.content.length > 0 ? (
        <p className="whitespace-pre-line text-sm">{post.content}</p>
      ) : null}

      {post.images.length > 0 ? <PostImageGrid images={post.images} /> : null}

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

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 3: Commit**

```bash
git add src/components/feed/PostCard.tsx
git commit -m "feat(feed): render PostImageGrid + PostOwnerMenu in PostCard"
```

---

## Task 22: Wire `Composer` to image uploads + visibility selector

**Files:**
- Modify: `src/components/feed/Composer.tsx`

- [ ] **Step 1: Replace the whole file with this content**

```tsx
import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { ImageIcon, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/use-auth'
import { useCreatePostMutation } from '@/features/feed/use-create-post'
import { useComposerImageUploads } from '@/features/media/use-composer-image-uploads'
import type { CreatePostBodyVisibilityEnumKey } from '@/gen/api/types/CreatePostBody.ts'
import { ComposerImageStrip } from './ComposerImageStrip'
import { ComposerVisibilitySelector } from './ComposerVisibilitySelector'

const MAX_CONTENT_LENGTH = 10000

function userInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

export function Composer() {
  const user = useAuthStore((s) => s.user)
  const [content, setContent] = useState('')
  const [visibility, setVisibility] =
    useState<CreatePostBodyVisibilityEnumKey>('public')
  const mutation = useCreatePostMutation()
  const uploads = useComposerImageUploads()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitting = mutation.isPending
  const trimmed = content.trim()
  const hasContent = trimmed.length > 0
  const hasImages = uploads.items.length > 0
  const canSubmit =
    (hasContent || hasImages) &&
    !uploads.anyPending &&
    (!hasImages || uploads.allDone) &&
    !submitting

  const submit = () => {
    if (!canSubmit) return
    mutation.mutate(
      {
        data: {
          content: trimmed,
          visibility,
          images: uploads.postImages.length > 0 ? uploads.postImages : undefined,
        },
      },
      {
        onSuccess: () => {
          setContent('')
          setVisibility('public')
          uploads.reset()
        },
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

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploads.add(e.target.files)
    }
    e.target.value = ''
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
      {uploads.items.length > 0 ? (
        <div className="mt-3">
          <ComposerImageStrip
            items={uploads.items}
            onRemove={uploads.remove}
            onRetry={uploads.retry}
            onReorder={uploads.reorder}
          />
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onPickFiles}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Add image"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <ImageIcon className="size-5" />
          </button>
          <ComposerVisibilitySelector
            value={visibility}
            onChange={setVisibility}
            disabled={submitting}
          />
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={submit}
          disabled={!canSubmit}
          aria-label={submitting ? 'Posting…' : 'Post'}
          aria-busy={submitting}
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : 'Post'}
        </Button>
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
git add src/components/feed/Composer.tsx
git commit -m "feat(feed): wire Composer to image uploads + visibility selector"
```

---

## Task 23: Add inline edit + owner menu to `CommentRow`

**Files:**
- Modify: `src/components/feed/CommentRow.tsx`

- [ ] **Step 1: Replace the whole file with this content**

```tsx
import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatTimeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useUpdateCommentMutation } from '@/features/feed/use-update-comment'
import type { Comment } from '@/gen/api/types/Comment.ts'
import { CommentOwnerMenu } from './CommentOwnerMenu'

function authorInitials(first: string, last: string): string {
  const f = first.trim().charAt(0)
  const l = last.trim().charAt(0)
  return (f + l).toUpperCase() || '?'
}

type Props = {
  comment: Comment
  postId: string
  pending?: boolean
}

export function CommentRow({ comment, postId, pending = false }: Props) {
  const fullName =
    `${comment.author.firstName} ${comment.author.lastName}`.trim()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(comment.content)
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
    <div className={cn('group flex gap-2', pending && 'opacity-70')}>
      <Avatar size="sm">
        <AvatarImage src={comment.author.avatarUrl ?? undefined} alt={fullName} />
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
            <div className="whitespace-pre-line text-sm">{comment.content}</div>
          </div>
        )}
        <div className="mt-1 flex items-center gap-2 px-3 text-xs text-muted-foreground">
          <span>{formatTimeAgo(comment.createdAt)}</span>
          {comment.isEdited ? <span>· Edited</span> : null}
        </div>
      </div>
      {!isEditing ? (
        <CommentOwnerMenu
          comment={comment}
          postId={postId}
          onEdit={startEdit}
        />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 2: Update `CommentList` to pass `postId` down**

Open `src/components/feed/CommentList.tsx` and replace the line:

```tsx
        <CommentRow key={c.id} comment={c} pending={pendingIds.has(c.id)} />
```

with:

```tsx
        <CommentRow
          key={c.id}
          comment={c}
          postId={postId}
          pending={pendingIds.has(c.id)}
        />
```

- [ ] **Step 3: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`.

- [ ] **Step 4: Commit**

```bash
git add src/components/feed/CommentRow.tsx src/components/feed/CommentList.tsx
git commit -m "feat(feed): add inline edit + owner menu to CommentRow"
```

---

## Task 24: Add avatar upload + name edit to `ProfileHeader`

**Files:**
- Modify: `src/components/friends/ProfileHeader.tsx`

- [ ] **Step 1: Replace the whole file with this content**

```tsx
import { useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { Camera, Loader2, MessageCircle, Pencil } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { useCommitAvatarMutation } from '@/features/media/use-commit-avatar'
import { usePresignAvatarMutation } from '@/features/media/use-presign-avatar'
import { uploadToR2 } from '@/features/media/upload-to-r2'
import { useUpdateUserMutation } from '@/features/profile/use-update-user'
import { FriendshipButton } from './FriendshipButton'
import type { User } from '@/gen/api/types/User.ts'
import type { PresignAvatarBodyContentTypeEnumKey } from '@/gen/api/types/PresignAvatarBody.ts'

const AVATAR_MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_AVATAR_TYPES: ReadonlySet<PresignAvatarBodyContentTypeEnumKey> =
  new Set(['image/jpeg', 'image/png', 'image/webp'])

function isAllowedAvatarType(
  value: string,
): value is PresignAvatarBodyContentTypeEnumKey {
  return ALLOWED_AVATAR_TYPES.has(value as PresignAvatarBodyContentTypeEnumKey)
}

function userInitials(firstName: string, lastName: string): string {
  const f = firstName.trim().charAt(0).toUpperCase()
  const l = lastName.trim().charAt(0).toUpperCase()
  const combined = `${f}${l}`
  return combined.length > 0 ? combined : '?'
}

type Props = { user: User }

export function ProfileHeader({ user }: Props) {
  const currentUserId = useAuthStore((s) => s.user?.id ?? null)
  const isSelf = currentUserId === user.id

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const initials = userInitials(user.firstName, user.lastName)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const presignAvatar = usePresignAvatarMutation()
  const commitAvatar = useCommitAvatarMutation()
  const [isUploading, setIsUploading] = useState(false)
  const avatarBusy =
    isUploading || presignAvatar.isPending || commitAvatar.isPending

  const updateUser = useUpdateUserMutation()
  const [isEditingName, setIsEditingName] = useState(false)
  const [firstNameDraft, setFirstNameDraft] = useState(user.firstName)
  const [lastNameDraft, setLastNameDraft] = useState(user.lastName)

  const trimmedFirst = firstNameDraft.trim()
  const trimmedLast = lastNameDraft.trim()
  const nameChanged =
    trimmedFirst !== user.firstName || trimmedLast !== user.lastName
  const canSaveName =
    trimmedFirst.length > 0 && trimmedLast.length > 0 && nameChanged

  const startEditName = () => {
    setFirstNameDraft(user.firstName)
    setLastNameDraft(user.lastName)
    setIsEditingName(true)
  }

  const cancelEditName = () => {
    setFirstNameDraft(user.firstName)
    setLastNameDraft(user.lastName)
    setIsEditingName(false)
  }

  const saveName = () => {
    if (!canSaveName) return
    updateUser.mutate(
      {
        id: user.id,
        data: { firstName: trimmedFirst, lastName: trimmedLast },
      },
      { onSuccess: () => setIsEditingName(false) },
    )
  }

  const onNameInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelEditName()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      saveName()
    }
  }

  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!isAllowedAvatarType(file.type)) {
      toast.info('Only JPEG, PNG, or WEBP avatars allowed')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.info('Avatar must be 5 MB or smaller')
      return
    }
    setIsUploading(true)
    try {
      const presigned = await presignAvatar.mutateAsync({
        id: user.id,
        data: { contentType: file.type },
      })
      await uploadToR2(
        presigned.data.uploadUrl,
        file,
        presigned.data.contentType,
      )
      await commitAvatar.mutateAsync({
        id: user.id,
        data: { objectKey: presigned.data.objectKey },
      })
    } catch {
      toast.error("Couldn't update avatar")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="rounded-lg bg-card p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="size-20">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={fullName} />
            ) : null}
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          {isSelf ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  void onPickAvatar(e)
                }}
                className="hidden"
              />
              <button
                type="button"
                aria-label="Change avatar"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-card hover:bg-primary/90 disabled:opacity-70"
              >
                <Camera className="size-3.5" />
              </button>
              {avatarBusy ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="size-6 animate-spin text-white" />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={firstNameDraft}
                onChange={(e) => setFirstNameDraft(e.target.value)}
                onKeyDown={onNameInputKeyDown}
                placeholder="First name"
                aria-label="First name"
                maxLength={60}
                autoFocus
                className="h-9 sm:w-40"
              />
              <Input
                value={lastNameDraft}
                onChange={(e) => setLastNameDraft(e.target.value)}
                onKeyDown={onNameInputKeyDown}
                placeholder="Last name"
                aria-label="Last name"
                maxLength={60}
                className="h-9 sm:w-40"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={saveName}
                  disabled={!canSaveName || updateUser.isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditName}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold">{fullName}</h1>
              {isSelf ? (
                <button
                  type="button"
                  onClick={startEditName}
                  aria-label="Edit name"
                  className="inline-flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <Pencil className="size-3.5" />
                </button>
              ) : null}
            </div>
          )}
        </div>
        {!isSelf ? (
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
        ) : null}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: `0 errors, 0 warnings`. If `Input` is not yet exported from `@/components/ui/input` the file already exists (Phase A) — confirm by reading the file.

- [ ] **Step 3: Commit**

```bash
git add src/components/friends/ProfileHeader.tsx
git commit -m "feat(profile): add avatar upload + inline name edit to ProfileHeader"
```

---

## Task 25: Manual smoke gate

**Files:** none

This task does not change code. It is the final acceptance gate per the spec §Testing Strategy. The implementer runs the dev server and walks the full smoke checklist below. A failure on any item means fixing it in a follow-up commit before declaring Phase E done.

- [ ] **Step 1: Make sure tooling is clean**

Run all three in sequence:

```bash
pnpm typecheck
pnpm lint
pnpm format
```

Expected: `0 errors, 0 warnings` from typecheck and lint; `prettier` makes no changes (or any changes are committed in a separate `style(...)` commit).

- [ ] **Step 2: Start the dev server**

In one terminal: `pnpm dev` (port 3000).
In another: confirm backend is on `http://localhost:8787`.

- [ ] **Step 3: Prepare test fixtures**

- Two test users: A (logged-in viewer) and B (someone else).
- Images: at least one JPEG, one PNG, one WEBP, one GIF (invalid), one ≥ 10 MB JPEG (invalid for posts), one ≥ 5 MB JPEG (invalid for avatar), one extreme aspect ratio image (e.g., 200×3000).
- DevTools Network tab open throughout.

- [ ] **Step 4: Run the 50-item smoke gate**

Walk the spec's §Testing Strategy items 1–50 in order. Mark each as it passes. If an item fails, fix at the source (no eslint/ts disables), commit the fix, restart from the failed item.

Reference (abbreviated; full descriptions in the spec):

  1. Phase D regression: `/`, `/friends`, `/friend-requests`, `/users/<B>`. Send request, accept, unfriend.
  2. Phase C regression: text-only post, like, comment.
  3. Compose 1 jpeg → single-image grid.
  4. Compose 4 mixed-type → 2×2 grid; batched presign + parallel PUTs in Network tab.
  5. Try 5+ images → 5th rejected `toast.info('Max 4 images per post')`.
  6. Reject by type (.gif).
  7. Reject by size (12 MB jpeg).
  8. Remove during upload → in-flight PUT cancelled in Network tab.
  9. Reorder pre-post → grid matches new order after publish.
  10. Retry failed slot (DevTools offline toggle).
  11. createPost fails → toast.error, composer preserved.
  12. Image-only post (empty text) — document outcome inline if 400.
  13. Submit while uploading → button disabled (no-op).
  14. Reset on success — text empty, no thumbs, visibility "Public".
  15. Lightbox open + cycle ArrowRight / ArrowLeft / Esc.
  16. Lightbox tab cycle stays inside.
  17. Single-image lightbox — chevrons hidden.
  18. Visibility selector default = "Public".
  19. Compose private post — survives reload in own feed.
  20. Visibility resets after success.
  21. Owner menu only on own posts.
  22. Owner menu — flip to private (no confirm).
  23. Owner menu — delete cancel.
  24. Owner menu — delete confirm (instant disappear).
  25. Owner menu — delete failure rolls back + toast.error.
  26. Comment edit happy path.
  27. Comment edit cancel.
  28. Comment edit Esc.
  29. Comment edit Save disabled when empty.
  30. Comment edit failure rolls back + toast.error.
  31. Comment delete decrements counter on all PostCard mounts.
  32. Comment delete cancel.
  33. Comment delete failure rolls back.
  34. Comment owner menu invisible-until-hover at `md`+.
  35. Comment owner menu always visible < `md`.
  36. No menus on others' content.
  37. Profile name edit happy path; sidebar `AvatarMenu` greeting updates.
  38. Profile name edit Esc.
  39. Profile name edit Save disabled when empty.
  40. Profile name edit failure rolls back + toast.error.
  41. Avatar upload happy path; updates everywhere current-user avatar mounts.
  42. Avatar upload type reject.
  43. Avatar upload size reject.
  44. Avatar commit failure → old avatar stays + toast.error.
  45. No edit affordances on other-user profile.
  46. Cross-mount sync — same-tab updates, no cross-tab broadcast.
  47. Dark mode contrast across every new surface.
  48. `pnpm typecheck` exits 0.
  49. `pnpm lint` exits 0 with no warnings.
  50. `git status` clean after the final commit.

- [ ] **Step 5: Declare done**

When all 50 items pass and the working tree is clean, Phase E is complete. No final code commit required for this task; any fixes were already committed individually.

---

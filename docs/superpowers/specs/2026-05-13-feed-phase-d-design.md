# Feed (Phase D) — Sidebar & Friends — Design

**Date:** 2026-05-13
**Status:** Draft (awaiting user review of written spec)
**Phase of:** Four-phase rollout — A: Auth pages (done) → B: Authenticated app shell (done) → C: Center-column feed + composer + likes + comments (done) → **D: Sidebar wiring, friend requests, friends list, profile pages (this spec)**

## Purpose

Wire every friend-related affordance in the app to the real backend. After Phase D, an authenticated user can:

1. Open `/users/$userId` for any user and see that user's profile (avatar, name, their posts in an infinite-scroll list).
2. On any user's profile, send a friend request, cancel a pending outgoing request, accept or decline an incoming request, or unfriend an existing friend — one click each, optimistic UI.
3. Click "Profile" in the avatar menu to land on their own `/users/$currentUserId` page (self-profile renders without a friendship button).
4. Open `/friends` to see all of their friends in an infinite-scroll list.
5. Open `/friend-requests` (already linked from the header) to see two sections — Incoming (Accept / Decline per row) and Outgoing (Cancel per row).
6. Use the right-sidebar "Your Friends" card and see live friends data instead of `SAMPLE_FRIENDS`.
7. Use the left-sidebar "Suggested People" and right-sidebar "You Might Like" cards and see live `listUsers` results, with a Connect / Follow button that fires a real friend request and reflects the resulting state (Pending / Friends).

Phase C feed, composer, likes, and comments remain unchanged. The Stories carousel, Events card, Notifications bell, Explore links, Messages icon, Search bar, and AvatarMenu's "Settings" item are untouched.

## Non-Goals

- **No unfriend / decline / cancel confirmation dialogs.** Each is a single-click commit. Reversible by re-sending or re-accepting where applicable; documented in Open Items.
- **No backend for the "Ignore" button** in `YouMightLikeCard`. It stays as `toast.info("Ignore coming soon")`, consistent with the Phase C pattern for buttons that have no backend.
- **No filter to exclude already-friends from suggestion cards.** `useSuggestedUsers` returns the first page of `listUsers` unchanged; if a suggested user happens to already be a friend or pending, `FriendshipButton` renders the correct state-aware label ("Friends" / "Pending") in that row.
- **No subtitle text on person rows.** The real `User` and `UserSummary` shapes have no `title` field; we don't fabricate one. The sample's "CEO of Apple"–style subtitles disappear.
- **No cover image, bio, or mutual-friends section on profile.** The profile page header has avatar + name + friendship button + a placeholder Message button (`toast.info`); the body is just the user's posts.
- **No message / chat wiring.** Profile "Message" button and `YourFriendsCard`'s friend-row chat affordance remain `toast.info("Messaging coming soon")` — chats are out of Phase D.
- **No "Settings" wiring** in `AvatarMenu` — stays as `toast.info`.
- **No "block user" affordance.**
- **No prefetch-on-hover** for profile links.
- **No header search input wiring.** The search bar continues to `toast.info`.
- **No replacement of Events card / Stories carousel / Notifications bell / Explore links** — none of those have backend endpoints in this assessment.
- **No automated tests.** Same manual smoke gate as Phases A / B / C. The cache-helper module (`friends-cache.ts`) is the kind of pure-function file that would be cheap to unit-test (~30 minutes of vitest); we opt out for consistency with prior phases. If a regression bites, retrofit unit tests for `friends-cache.ts` first.
- **No offset → cursor compatibility shim for `listUsers`.** It uses page-based pagination in the spec, but Phase D only consumes page 1 (limit 4) and never paginates further — so the difference is invisible.
- **No optimistic update of `useUser(id)` profile data** on accept / send / delete. That query returns a plain `User` with no friendship field; nothing to patch.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Cache architecture | Pure helpers in `src/features/friends/friends-cache.ts`; snapshot + patch in `onMutate`, rollback in `onError`, **no `onSettled` refetch** | Mirrors Phase C's `feed-cache.ts` / `useTogglePostLike` exactly. Consistent pattern across the codebase. |
| Mutation strategy | Optimistic for all three friend mutations (`send`, `accept`, `delete`) | Same trade-off as Phase C likes: snappy UI, no refetch storm; ±1 drift on rare conflicts is acceptable and reconciled via 409 handling. |
| Friendship state derivation | A `useFriendshipStatus(userId)` hook composes three cached list queries (friends, incoming, outgoing) and returns a discriminated `'self' \| 'none' \| 'outgoing' \| 'incoming' \| 'friend'` | The API does not expose `viewerState` on `User`; cross-referencing the three lists is the only client-side way to learn relationship state. The three lists are also rendered on `/friends` and `/friend-requests`, so TanStack Query dedupes their fetches. |
| Drift handling | Cache-derived state may be stale if the relevant user is beyond loaded page 1 of a list on cold load. Server validates; 409 errors trigger rollback + targeted refetch of the three lists + a toast. | Honest about the trade-off; same flavor as Phase C's "±1 likes drift". Documented in Open Items. |
| Friend list query key | `['friends', 'infinite'] as const` | Singleton cache entry for "my friends". |
| Incoming requests query key | `['friend-requests', 'incoming', 'infinite'] as const` | Mirrors structure of friends key. |
| Outgoing requests query key | `['friend-requests', 'outgoing', 'infinite'] as const` | Same. |
| Suggested users query key | `['users', 'suggested'] as const` (non-infinite `useQuery`) | We only fetch page 1, limit 4; no need for infinite-query machinery. |
| User profile query key | `['user', userId] as const` (via `userQueryKey(userId)`) | Per-user cache slot. |
| User posts query key | `['user-posts', userId, 'infinite'] as const` (via `userPostsQueryKey(userId)`) | Per-user infinite cache, structurally identical to the feed key. |
| Routes | Three: `/friends` (new), `/friend-requests` (rewrite of Phase B placeholder), `/users/$userId` (new). All under `_app/`, auth-guarded by inheritance. | Splits friends list and requests page rather than introducing tab state. Preserves the existing `<Link to="/friend-requests">` in `HeaderNavLinks`. |
| Profile route file | `src/routes/_app/users.$userId.tsx`, param read via `Route.useParams()` | Matches TanStack Router file-based dynamic-segment convention. |
| Self-profile | If `userId === currentUser.id`, `FriendshipButton` returns `null`; everything else (header, posts list) renders normally | Lets the user see their own posts from another's perspective without adding an Edit Profile path. |
| `deleteFriendRelationship` modes | The mutation hook takes `{ user, mode: 'unfriend' \| 'cancel' \| 'decline' }`; mode selects which cache to patch and which toast to show on error | Single API endpoint covers three UX actions; making the mode explicit at the call site keeps the cache surgery legible. |
| Sidebar Connect / Follow data source | `useSuggestedUsers` wraps `listUsers({ page: 1, limit: 4 })`; the left card slices the top 3, the right card takes the 4th | Real user IDs are required to call `sendFriendRequest`; the smallest cut is a single shared query that splits across both cards. |
| Sidebar action buttons | Render `<FriendshipButton user={...} variant=... />` in place of the legacy hard-coded Connect / Follow buttons | One state machine for every friend affordance in the app. |
| Sidebar `YourFriendsCard` | Replace `SAMPLE_FRIENDS` with `useFriends().friends`; drop the green online-presence dot entirely (no API field for it) | Phase D is about making the sidebar real — a fake online indicator undermines that. The slot becomes empty. |
| Person row layout | Shared `<PersonRow>` component: avatar + (firstName + lastName) + optional action slot. Reused by SuggestedPeopleCard, YouMightLikeCard, YourFriendsCard, FriendsPage, FriendRequestRow | Five callsites, identical layout — extracting beats duplicating. |
| Pending-mutation dimming | `FriendshipButton` calls `useMutationState` filtered by each mutation key and inspects context `userId` to know if a mutation is in-flight for this row; disables button + shows inline spinner | Mirrors Phase C's `CommentList` + `pickTempId` + `Set.has(c.id)` pattern. |
| Toasts | `toast.error(...)` for failure; `toast.info(...)` for unwired buttons; no success toast | Matches Phase C. |
| Avatar / initials helper | Local `userInitials(first, last)` per file | Matches Phase C ("no shared helper"). |
| Skeletons | A per-feature `FriendsSkeletonRow.tsx` for list rows; reuse Phase C's `FeedSkeletonCard` for the profile posts list | Plain `animate-pulse bg-muted` divs, same as Phase C. |
| Module placement | Hooks in `src/features/friends/`; presentational components in `src/components/friends/`; sidebar card surgery in `src/components/shell/cards/*` in place; routes in `src/routes/_app/` | Matches Phase C split. |
| Sample data deletion | Delete `SAMPLE_SUGGESTED_PEOPLE`, `SAMPLE_YOU_MIGHT_LIKE`, `SAMPLE_FRIENDS`, `SamplePerson`, `SampleFriend`, `FriendStatus` from `src/data/sample-shell.ts`. Keep `EXPLORE_LINKS`, `SAMPLE_NOTIFICATIONS`, `SAMPLE_STORIES`, `SAMPLE_EVENTS` (their consumers are out of Phase D scope) | Removes now-unused fiction; the rest still has live consumers. |

## Components & Responsibilities

Each module has one job, narrow inputs, and is reasoned about in isolation. Mutations live in `src/features/friends/`; presentational components in `src/components/friends/`; sidebar cards are modified in place under `src/components/shell/cards/`; routes are flat files under `src/routes/_app/`.

### Pure helpers — `src/features/friends/friends-cache.ts`

| Helper | Signature | Caller |
|---|---|---|
| `prependFriend` | `(pages: FriendsPages \| undefined, friend: Friend) => FriendsPages` | `useAcceptFriendRequest` |
| `removeFriendByUserId` | `(pages: FriendsPages \| undefined, userId: string) => FriendsPages \| undefined` | `useDeleteFriendRelationship` (mode `unfriend`) |
| `prependRequest` | `(pages: RequestsPages \| undefined, request: FriendRequest) => RequestsPages` | `useSendFriendRequest` (outgoing cache) |
| `removeRequestByUserId` | `(pages: RequestsPages \| undefined, userId: string) => RequestsPages \| undefined` | `useAcceptFriendRequest` (incoming) + `useDeleteFriendRelationship` (modes `cancel` & `decline`) |

All four return new immutable `InfiniteData` snapshots; never mutate input. Type aliases:

```ts
export type FriendsPages = InfiniteData<ListFriendsQueryResponse, string | undefined>
export type RequestsPages = InfiniteData<ListIncomingFriendRequestsQueryResponse, string | undefined>
// outgoing has the same envelope; same alias works for both.
```

### Query hooks — `src/features/friends/`

| Hook | API | Returns |
|---|---|---|
| `useFriends()` | `useInfiniteQuery` over `listFriends`, limit 20 | `{...query, friends: Friend[]}` (memoized flatten) |
| `useIncomingRequests()` | `useInfiniteQuery` over `listIncomingFriendRequests`, limit 20 | `{...query, incomingRequests: FriendRequest[]}` |
| `useOutgoingRequests()` | `useInfiniteQuery` over `listOutgoingFriendRequests`, limit 20 | `{...query, outgoingRequests: FriendRequest[]}` |
| `useSuggestedUsers()` | `useQuery` over `listUsers({ page: 1, limit: 4 })` | `{...query, users: User[]}` |
| `useUser(userId)` | `useQuery` over `getUser({ id: userId })` | The standard `useQuery` shape (no derived field) |
| `useUserPosts(userId)` | `useInfiniteQuery` over `listPostsByUser`, limit 20 | `{...query, posts: Post[]}` (memoized flatten) |
| `useFriendshipStatus(userId)` | Reads from the three list queries above + `useAuthStore` | `{ state, isLoading }` |

`useFriendshipStatus` derivation order:
1. If `userId === useAuthStore.getState().user?.id` → `'self'`.
2. If any loaded page of `useFriends().data.pages` contains `friend.user.id === userId` → `'friend'`.
3. If any loaded page of `useOutgoingRequests().data.pages` contains `request.user.id === userId` → `'outgoing'`.
4. If any loaded page of `useIncomingRequests().data.pages` contains `request.user.id === userId` → `'incoming'`.
5. Otherwise → `'none'`.

`isLoading` is `useFriends().isLoading || useIncomingRequests().isLoading || useOutgoingRequests().isLoading`.

### Mutation hooks — `src/features/friends/`

| Hook | Mutate args | Cache effects (on optimistic mutate) | Rollback target |
|---|---|---|---|
| `useSendFriendRequest()` | `{ user: UserSummary }` | Snapshot outgoing-cache; prepend optimistic `FriendRequest = { user, requesterId: currentUserId, createdAt: nowIso }` | Outgoing-cache |
| `useAcceptFriendRequest()` | `{ user: UserSummary }` | Snapshot incoming-cache and friends-cache; remove user from incoming; prepend `Friend = { user, acceptedAt: nowIso }` to friends | Both caches |
| `useDeleteFriendRelationship()` | `{ user: UserSummary, mode: 'unfriend' \| 'cancel' \| 'decline' }` | Branch by mode: snapshot + remove from friends OR outgoing OR incoming | The mode-selected cache |

All three mutations:
- Cancel in-flight queries for affected keys via `queryClient.cancelQueries` before snapshot — same Phase C protocol.
- Return a context shape including `userId` so `FriendshipButton`'s `useMutationState` can find pending entries.
- `onError`: restore snapshot(s); `toast.error(...)` with a mode-appropriate message.
- On 409 specifically: in addition to rollback, call `query.refetch()` on the three lists to reconcile and `toast.error("This relationship has already changed")`.
- No `onSuccess` cache writes for `send` (optimistic entry stays valid). For `accept`, no `onSuccess` write either (`Friend` body was assembled optimistically with the same `user` payload the server has). For `delete`, no-op.

### Components — `src/components/friends/`

| Component | Props | Renders |
|---|---|---|
| `FriendshipButton` | `{ user: User \| UserSummary, variant: 'primary' \| 'inline' \| 'ghost' }` | One or two buttons per the state-machine table; or `null` if `'self'` |
| `PersonRow` | `{ user: UserSummary, avatarSize?, action?: ReactNode, linkTo?: string }` | `flex items-center gap-3` row used in all sidebar and list rendering |
| `FriendRequestRow` | `{ request: FriendRequest, kind: 'incoming' \| 'outgoing' }` | A `PersonRow` whose action slot renders Accept + Decline (incoming) or Cancel (outgoing) |
| `FriendsSkeletonRow` | (none) | Single pulsing `<PersonRow>`-shaped placeholder |
| `ProfileHeader` | `{ user: User }` | Avatar (xl) + name + `FriendshipButton variant="primary"` + Message button (`toast.info`) |
| `UserPostsList` | `{ userId: string }` | Infinite-scroll list of `PostCard` (reused from Phase C), reusing Phase C states (empty / error / sentinel / "all caught up") |

### Routes — `src/routes/_app/`

| File | URL | Component |
|---|---|---|
| `friends.tsx` (new) | `/friends` | Renders `<FriendsPage />` — heading + infinite list of `<PersonRow user={f.user} linkTo={`/users/${f.user.id}`} />` |
| `friend-requests.tsx` (rewrite) | `/friend-requests` | Renders Incoming section + Outgoing section, each an infinite list of `<FriendRequestRow />` with its own empty / error / load-more |
| `users.$userId.tsx` (new) | `/users/$userId` | Reads `userId` via `Route.useParams()`, renders `<ProfileHeader user={user} />` + `<UserPostsList userId={userId} />` |

### Sidebar card surgery — `src/components/shell/cards/`

| File | Change |
|---|---|
| `SuggestedPeopleCard.tsx` | Replace `SAMPLE_SUGGESTED_PEOPLE` with `useSuggestedUsers().users.slice(0, 3)`. Each row → `<PersonRow user={u} linkTo={`/users/${u.id}`} action={<FriendshipButton user={u} variant="inline" />} />`. "See All" button stays as `toast.info` (no all-users browse page in Phase D scope). |
| `YouMightLikeCard.tsx` | Replace `SAMPLE_YOU_MIGHT_LIKE[0]` with `useSuggestedUsers().users[3]` (single card slot). Action slot renders `<FriendshipButton user={u} variant="primary" />` + Ignore button still `toast.info`. |
| `YourFriendsCard.tsx` | Replace `SAMPLE_FRIENDS` with `useFriends().friends`. Drop the presence dot rendering entirely. Each row → `<PersonRow user={f.user} linkTo={`/users/${f.user.id}`} />` (no action slot). "See All" button → `<Link to="/friends">`. Search bar stays as `toast.info("Search coming soon")` — server has no friend-search endpoint. |
| `AvatarMenu.tsx` | "Profile" item — replace `toast.info` with `<Link to="/users/$userId" params={{ userId: currentUser.id }}>`. Settings stays as toast. |

## Data Flow

### Sending a friend request from the profile page

1. User on `/users/$userId`. `useUser(userId)` → `User` data hydrates `<ProfileHeader>`. `useFriendshipStatus(userId)` returns `'none'`. `<FriendshipButton>` renders "Connect".
2. User clicks "Connect". `useSendFriendRequest().mutate({ user })` runs.
3. `onMutate`: cancel in-flight outgoing queries; snapshot outgoing-cache; prepend `{ user, requesterId: meId, createdAt: now }`; return `{ previous, userId }`.
4. `useFriendshipStatus(userId)` re-derives → finds entry in outgoing-cache → returns `'outgoing'`. Button re-renders as "Pending".
5. `useMutationState` picks up the pending entry; button shows inline spinner + disabled.
6. Server `POST /friends/requests` → 201 with `Friendship`. `onSuccess`: no cache write (optimistic entry stays). Pending state ends.
7. Network failure → `onError` restores snapshot. Button reverts to "Connect". `toast.error("Couldn't send friend request")`.
8. 409 conflict → rollback + `useFriends`/`useIncomingRequests`/`useOutgoingRequests` refetch + `toast.error("This relationship has already changed")`.

### Accepting an incoming request from `/friend-requests`

1. `<FriendRequestRow request={r} kind="incoming">` renders Accept + Decline.
2. Click Accept → `useAcceptFriendRequest().mutate({ user: r.user })`.
3. `onMutate`: snapshot incoming + friends caches; remove `r.user.id` from incoming; prepend `Friend = { user: r.user, acceptedAt: now }` to friends.
4. The Incoming list re-renders without this row; `/friends` (if open in another tab? no — same-tab cache) shows the new friend at top. `<FriendshipButton>` anywhere visible for this user re-derives to `'friend'`.
5. Server `POST /friends/requests/$user_id/accept` → 200. No `onSuccess` cache writes.
6. Network failure → rollback both caches; toast.

### Unfriending from `/friends`

1. User on `/friends`. Each row's `<PersonRow>` action slot includes `<FriendshipButton user={f.user} variant="ghost" />`. State = `'friend'`. Button reads "Friends".
2. Click Friends → `useDeleteFriendRelationship().mutate({ user: f.user, mode: 'unfriend' })`.
3. `onMutate`: snapshot friends-cache; remove user; return `{ previous, mode, userId }`.
4. Row disappears; `<FriendshipButton>` for this user re-derives to `'none'` everywhere it's mounted.
5. Server `DELETE /friends/requests/$user_id` → 200.
6. Failure → restore friends-cache; `toast.error("Couldn't unfriend")`.

### Profile page invalid id

1. Route component mounts with bogus `$userId`. `useUser(userId)` fires `getUser`.
2. Server returns 404. `useUser.isError` → true.
3. `<ProfileHeader>` renders a "User not found" card (or generic "Couldn't load profile. Retry." for non-404 errors).
4. `<UserPostsList>` does not render in the 404 case (guard on user presence).

## Build Order

The implementation plan that follows this spec breaks the work into incremental commits in this order (each step is a small, reviewable commit ending in a passing `pnpm typecheck`):

1. `src/features/friends/friends-cache.ts` — pure helpers + types.
2. `src/features/friends/use-friends.ts`, `use-incoming-requests.ts`, `use-outgoing-requests.ts`, `use-suggested-users.ts`, `use-user.ts`, `use-user-posts.ts` — query hooks (in any order; each is self-contained).
3. `src/features/friends/use-friendship-status.ts` — composes the three list hooks.
4. `src/features/friends/use-send-friend-request.ts`, `use-accept-friend-request.ts`, `use-delete-friend-relationship.ts` — mutation hooks.
5. `src/components/friends/PersonRow.tsx`, `FriendsSkeletonRow.tsx` — primitives.
6. `src/components/friends/FriendshipButton.tsx` — depends on (3) and (4).
7. `src/components/friends/FriendRequestRow.tsx`, `ProfileHeader.tsx`, `UserPostsList.tsx` — depend on (5) and (6).
8. `src/routes/_app/friends.tsx` (new) — wires the page.
9. `src/routes/_app/friend-requests.tsx` (rewrite of the placeholder).
10. `src/routes/_app/users.$userId.tsx` (new).
11. `src/components/shell/cards/YourFriendsCard.tsx` — swap to live data + drop presence dot.
12. `src/components/shell/cards/SuggestedPeopleCard.tsx` — swap to live data.
13. `src/components/shell/cards/YouMightLikeCard.tsx` — swap to live data.
14. `src/components/shell/AvatarMenu.tsx` — Profile link.
15. `src/data/sample-shell.ts` — delete unused exports + types.
16. Manual smoke gate (final task — see Testing Strategy).

## Open Items / Risks

- **Friendship-state drift past page 1.** `useFriendshipStatus` only sees loaded pages of the three lists. A user with >20 friends, requests, etc., visiting a profile cold may render `'none'` for a known friend until they scroll `/friends`. Acceptable for an assessment because (a) server still validates and 409 reconciles; (b) within a session, mutation cache writes keep state correct; (c) the scope of the assessment is unlikely to involve hundreds of friends. If this becomes painful, the fix is to add a single `GET /friends/relationship?userId=X` endpoint (out of frontend scope) or to eagerly prefetch all pages of all three lists.
- **No automated tests for `friends-cache.ts`.** Same trade-off as Phase C — consistent with prior phases, but the cache helpers are the surface most likely to silently break. If a bug bites Phase D, retrofitting unit tests for these four pure functions is the first step.
- **`useSuggestedUsers` returns whoever happens to be on `listUsers` page 1.** That may include yourself, current friends, or pending users. State-aware `FriendshipButton` handles those cases visually (renders "Friends" or "Pending" instead of "Connect"). It's mildly weird in a "Suggested for you" context but functionally correct.
- **No `successful-action` toasts.** Phase D follows Phase C's "no success toast" rule. A future polish pass could add toasts on accept/unfriend if reviewers expect louder feedback.
- **No undo on unfriend / decline / cancel.** A misclick requires re-sending a request or re-accepting from `/friend-requests`. A future polish pass could add a 5-second-undo toast (sonner supports this pattern via `toast.success` + action).
- **`sample-shell.ts` deletion blast radius.** The plan must verify no other file imports the deleted exports before the deletion commit lands; a `Grep` step prior to the delete catches this.
- **AvatarMenu "Profile" Link** depends on a populated `useAuthStore.user`. If the menu is rendered before `initializeAuth` completes (unlikely in `_app` — the route guard already blocks unauthenticated rendering), guard the Link with a `user ?` check.

## Testing Strategy

This phase is gated by a manual smoke checklist run against `pnpm dev` (port 3000) with the backend on `http://localhost:8787` and two test users — A (the logged-in viewer) and B (someone for A to interact with). Each item is a literal step; a failure means fixing it before the phase is declared done.

1. **Phase C regression.** Cold-load `/` → home feed loads, composer works, like and comment a post.
2. **Self-profile from AvatarMenu.** Click avatar → Profile → lands on `/users/<A.id>`. No `FriendshipButton` rendered. Posts list shows A's own posts.
3. **Direct profile load (other user).** Visit `/users/<B.id>` — header (avatar + name) + posts list render. `FriendshipButton` renders "Connect" (assuming no prior relationship).
4. **Send request — happy path.** On B's profile, click Connect → button flips to "Pending" instantly. Open `/friend-requests` → Outgoing section lists B at top. Refresh → still pending.
5. **Send request — failure.** Stop backend; click Connect on another user C's profile → button flips then snaps back ~100ms later. Error toast appears. Restart backend; click again → succeeds.
6. **Cancel outgoing.** On B's profile (state Pending), click "Pending" → flips to Connect. `/friend-requests` Outgoing no longer lists B. Refresh confirms.
7. **Receive incoming.** (Test setup: have B's account send a request to A via API directly or B-as-logged-in tab.) On A's `/friend-requests` Incoming, the row shows B with Accept + Decline buttons. Visit B's profile → button shows Accept + Decline.
8. **Accept incoming.** Click Accept. Row disappears from Incoming. `/friends` lists B at top. B's profile shows "Friends".
9. **Decline incoming.** Repeat steps 7–8 with user D but click Decline → row disappears from Incoming. D's profile reverts to "Connect".
10. **Unfriend.** From `/friends` or from B's profile, click "Friends" → row disappears; profile shows "Connect". `/friends` reflects.
11. **Unfriend failure.** Kill backend, click "Friends" → flips then rolls back ~100ms later + error toast. Restart backend; retry succeeds.
12. **Sidebar Connect (SuggestedPeopleCard).** Left sidebar shows 3 live users. Click Connect on one → flips to "Pending"; `/friend-requests` Outgoing shows them.
13. **Sidebar Follow (YouMightLikeCard).** Right sidebar shows 1 live user (the 4th from `listUsers`). Click Follow → flips to "Pending".
14. **Sidebar Ignore.** Click Ignore in `YouMightLikeCard` → `toast.info`; no state change; row stays.
15. **YourFriendsCard live data.** Right sidebar "Your Friends" lists actual friends (whoever was friended in 8). No green presence dot anywhere. "See All" → navigates to `/friends`. Friend row click → navigates to that user's profile.
16. **`/friends` infinite scroll.** With ≥21 friends (seed if needed), scroll → next page loads with a skeleton row briefly. Final page renders "You've seen all your friends".
17. **`/friend-requests` infinite scroll (each section).** Same as 16 but for Incoming and Outgoing independently.
18. **Profile posts infinite scroll.** On a user with ≥21 posts, scroll on `/users/$userId` → next page loads.
19. **Invalid `userId`.** Visit `/users/00000000-0000-0000-0000-000000000000` → "User not found" card; no posts list.
20. **409 conflict reconciliation.** With two tabs: from tab 2 send a request to B. In tab 1, click Connect on B's profile (cache says "Connect" because tab 1's cache is stale) → optimistic flip to "Pending", then server returns 409 → rollback to "Connect", error toast appears, lists refetch and the button finally settles on "Pending" (because the refetched outgoing list now contains the entry from tab 2). **Tolerated outcome:** brief flicker; consistent end state.
21. **Dark mode legibility.** Toggle dark theme; all new surfaces — `/friends`, `/friend-requests`, `/users/$userId`, sidebar rows, FriendshipButton variants, skeleton rows, error/empty cards — render without contrast bugs.
22. **Logout regression.** Click Logout → `/auth/login`. Re-login → land at `/`. `/friends` and sidebars do not show stale prior-user data.
23. **`pnpm typecheck`** exits 0. `pnpm lint` exits 0 with no warnings.
24. **`git status`** clean after the final commit.

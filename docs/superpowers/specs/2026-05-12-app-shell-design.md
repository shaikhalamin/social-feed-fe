# App Shell (Phase B) — Design

**Date:** 2026-05-12
**Status:** Approved (awaiting user review of written spec)
**Phase of:** Three-phase rollout — A: Auth pages (done) → **B: Authenticated app shell (this spec)** → C: Feed page + must-work interactions (separate spec)

## Purpose

Port the entire visual surface of `sample_screens/feed.html` — top header, left sidebar, right sidebar, and every contained card / widget — into the authenticated `_app` layout, replacing the current minimal placeholder header. No element from the sample is dropped. Theme toggle and logout work for real; everything that would require API integration we have not yet wired (search, notifications content, suggested people, friend status, events, etc.) renders as static-from-sample data and shows `toast.info("…coming soon")` on interaction.

Phase B does not touch the feed itself. The center column receives three visual stubs (stories carousel, composer placeholder, feed placeholder) so the three-column rhythm of the sample is preserved end-to-end; Phase C replaces the composer and feed stubs with the live versions.

## Non-Goals

- No live API integration for search, notifications, suggested people, "you might like", "your friends" status, stories carousel, or events — all sample-data only in Phase B.
- No `/_app/profile/:userId`, `/_app/messages`, `/_app/settings`, `/_app/groups`, `/_app/events`, etc. routes — links in the sample that we don't yet have a destination for go to `#` and fire `toast.info`.
- No feed list, no composer, no comments, no likes — that's Phase C.
- No real notifications backend wire-up — the bell badge "6" is static, and the dropdown rows are sample data.
- No image upload for avatars — `AvatarMenu` uses the current user's existing `avatarUrl` from `useAuthStore`, or initials fallback when null.
- No mobile drawer / off-canvas for sidebars — at `<lg` both sidebars collapse out of the grid (hidden); only the header survives. Center column becomes full-width.
- No live data backing the "Connect" / "Follow" buttons. They fire `toast.info` in Phase B; Phase C will rewire those exact `onClick` handlers to `useSendFriendRequest`.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Grid system | Tailwind `lg:grid-cols-12` with `lg:col-span-3 / lg:col-span-6 / lg:col-span-3` (left / center / right) | Mirrors sample's `col-xl-3 / col-xl-6 / col-xl-3` rhythm. |
| Max container width | `max-w-[1320px]` centered | Matches sample's `_custom_container`. |
| Dropdown primitive | shadcn `dropdown-menu` (Radix) | Used by notifications bell and avatar menu. |
| Avatar primitive | shadcn `avatar` (Radix) | Initials fallback when `avatarUrl` is null. |
| Scroll-area primitive | shadcn `scroll-area` (Radix) | Notifications dropdown and Your-Friends list scroll. |
| Separator primitive | shadcn `separator` (Radix) | Sample uses `<hr class="_underline">` inside cards. |
| Theme state | Zustand store + `localStorage` key `"theme"` (`"light" | "dark"`) | Tiny store; no React Context; survives reloads. |
| No-flash on dark load | Inline `<script>` in `index.html` (or pre-render call in `main.tsx`) applying `.dark` class before React mounts | Standard no-FOUC pattern. |
| Dark palette source | Hand-tuned overrides in `:root.dark { … }` derived from shadcn slate base; primary stays `#377DFF` | Sample doesn't ship a full dark palette; we define a sensible one with the brand primary preserved. |
| Static sample data | Centralized in `src/data/sample-shell.ts` (names, avatars, notification rows, events, etc.) | Keeps card components declarative; one file to delete or replace when Phase C+ wires real data. |
| Sticky behavior | Header `sticky top-0 z-40`; sidebars scroll with page | Matches sample. |
| Active route | TanStack Router's `useMatchRoute` per nav icon | Matches sample's `_header_nav_link_active` class. |
| Sample asset hosting | Copy `people1-3.png`, `profile-1.png`, `card_ppl1-4.png`, `Avatar.png`, `mobile_story_img*.png`, `friend-req.png`, `feed_event1.png`, `mini_pic.png` from `sample_screens/assets/images/` to `public/shell/` | Keeps fidelity; one folder to scrub when Phase C+ wires real data. |
| Icons | Inline SVGs preserved verbatim from sample for fidelity; centralized in `src/components/shell/icons/index.tsx` | Sample's nav SVGs have unique stroke quirks (active state path); not worth swapping for lucide. |
| Theme toggle position | Floating fixed pill on left edge (matches sample's `_layout_mode_swithing_btn`); **not** in the header | Faithful to sample layout. |
| Module placement | `src/components/shell/` for everything new; `src/components/ui/` for the four added shadcn primitives; `src/lib/theme.ts` + `src/hooks/use-theme.ts` for theme state; `src/data/sample-shell.ts` for static data | Shell components are presentational; theme is the only stateful piece; sample data is one isolated file. |

## Components & Responsibilities

Every module has one clear job, narrow inputs, and can be reasoned about in isolation. Where a component needs auth state, it pulls from `useAuthStore`; where it needs theme, it pulls from `useThemeStore`. No prop-drilling through layout layers.

### Foundation

#### `components.json`
**Unchanged from Phase A.**

#### `src/components/ui/dropdown-menu.tsx` (shadcn add)
**Purpose:** Radix dropdown menu primitive. Default shadcn output, no customization.

#### `src/components/ui/avatar.tsx` (shadcn add)
**Purpose:** Radix avatar with `<AvatarImage>` + `<AvatarFallback>`. Default shadcn output.

#### `src/components/ui/scroll-area.tsx` (shadcn add)
**Purpose:** Radix scroll area for the notifications dropdown and friends list. Default shadcn output.

#### `src/components/ui/separator.tsx` (shadcn add)
**Purpose:** Radix separator. Default shadcn output.

#### `src/lib/theme.ts`
**Purpose:** Pure helpers for theme persistence.
**Exports:**
- `type Theme = "light" | "dark"`
- `const THEME_STORAGE_KEY = "theme"`
- `function readStoredTheme(): Theme` — reads `localStorage`; returns `"light"` if missing or invalid; swallows any storage exception.
- `function applyTheme(theme: Theme): void` — toggles `.dark` class on `document.documentElement`.

No React imports. Pure side-effect helpers.

#### `src/hooks/use-theme.ts`
**Purpose:** Zustand store for theme state.
**Exports:**
- `useThemeStore` — Zustand store with `{ theme: Theme; setTheme(t: Theme): void; toggle(): void }`. The setter calls `applyTheme(t)` and writes to `localStorage` (best-effort). Initial value bootstrapped from `readStoredTheme()`.

#### `index.html` (modified)
**Adds** before `<div id="root"></div>`:
```html
<script>
  (function () {
    try {
      if (localStorage.getItem("theme") === "dark") {
        document.documentElement.classList.add("dark");
      }
    } catch (_) {}
  })();
</script>
```
**Purpose:** Apply `.dark` before React mounts so dark-mode users don't see a light flash.

#### `src/index.css` (modified)
**Adds** at the bottom (after the existing `body { … }` block):
```css
:root.dark {
  --background: #0f172a;
  --foreground: #e2e8f0;
  --card: #1e293b;
  --card-foreground: #e2e8f0;
  --popover: #1e293b;
  --popover-foreground: #e2e8f0;
  --primary: #377dff;
  --primary-foreground: #ffffff;
  --secondary: #334155;
  --secondary-foreground: #e2e8f0;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #1e3a8a;
  --accent-foreground: #93c5fd;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(255, 255, 255, 0.08);
  --input: rgba(255, 255, 255, 0.12);
  --ring: #377dff;
}
```

#### `src/data/sample-shell.ts`
**Purpose:** Single source of static placeholder data used by every decorative card.
**Exports (all `const`):**
- `EXPLORE_LINKS: { label: string; iconName: ExploreIconName; badge?: "New"; }[]` — 8 items (Learning [New], Insights, Find friends, Bookmarks, Group, Gaming [New], Settings, Save post).
- `SAMPLE_NOTIFICATIONS: { id: string; kind: NotificationKind; actorName: string; actorAvatar: string; text: string; timeAgo: string; }[]` — ~8 rows mirroring sample.
- `SAMPLE_SUGGESTED_PEOPLE: { id: string; name: string; title: string; avatar: string }[]` — 3 entries (Steve Jobs / CEO of Apple, Ryan Roslansky / CEO of LinkedIn, Dylan Field / CEO of Figma).
- `SAMPLE_YOU_MIGHT_LIKE: { id: string; name: string; title: string; avatar: string }[]` — Radovan SkillArena / Founder & CEO at Trophy.
- `SAMPLE_FRIENDS: { id: string; name: string; title: string; avatar: string; status: "online" | "offline" | "active-ago"; lastSeen?: string }[]` — ~8 entries with mixed statuses (online green dot or "X minute ago" text).
- `SAMPLE_STORIES: { id: string; name: string; avatar: string; isOwn?: boolean }[]` — 4 entries (Your Story + 3 friends).
- `SAMPLE_EVENTS: { id: string; title: string; day: string; month: string; image: string; attendeesText: string }[]` — 2 entries (sample shows duplicates of "No more terrorism no more cry" / 10 Jul / 17 People Going).

All avatar/image paths are absolute (`/shell/people1.png`, etc.) — the components don't construct paths.

### Icons

#### `src/components/shell/icons/index.tsx`
**Purpose:** One named export per inline SVG from the sample, so consumers stay tidy.
**Exports:** `<HomeIcon active?: boolean />`, `<FriendsIcon active?: boolean />`, `<BellIcon />`, `<MessageIcon />`, `<SearchIcon />`, `<SunIcon />`, `<MoonIcon />`, `<PlusIcon />`, `<GreenDotIcon />`, `<ArrowRightIcon />`, plus the per-explore-link icons (`<LearningIcon />`, `<InsightsIcon />`, `<FindFriendsIcon />`, `<BookmarksIcon />`, `<GroupIcon />`, `<GamingIcon />`, `<SettingsIcon />`, `<SavePostIcon />`).

Each takes an optional `className`. SVG markup is copied verbatim from the sample.

### Layout root

#### `src/components/shell/AppLayout.tsx`
**Purpose:** Outermost wrapper for `/_app/*` routes. Mounts the header + floating theme toggle, then the three-column grid containing left sidebar, `<Outlet />`, right sidebar.
**Props:** none.
**Reads:** nothing from stores.
**Renders:**
```tsx
<div className="min-h-screen bg-background text-foreground">
  <FloatingThemeToggle />
  <AppHeader />
  <div className="mx-auto max-w-[1320px] px-4 pt-6">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <aside className="hidden lg:block lg:col-span-3"><LeftSidebar /></aside>
      <main className="col-span-1 lg:col-span-6"><Outlet /></main>
      <aside className="hidden lg:block lg:col-span-3"><RightSidebar /></aside>
    </div>
  </div>
</div>
```

### Header

#### `src/components/shell/AppHeader.tsx`
**Purpose:** Sticky top bar.
**Structure:** Logo (Link to `/`), `<SearchBar />`, spacer, `<HeaderNavLinks />`, `<NotificationsBell />`, `<AvatarMenu />`. Container `sticky top-0 z-40 border-b border-border bg-card`, inner `max-w-[1320px] px-4 h-16 flex items-center gap-6`.

#### `src/components/shell/SearchBar.tsx`
**Purpose:** Decorative search input.
**Props:** none.
**Behavior:** Controlled internal state for cosmetic typing. `onSubmit` and `onChange` (debounced or per-change is fine — we don't actually care) call `toast.info("Search coming soon")`. Magnifier icon left, `<input type="search">` placeholder "input search text".
**Layout:** `relative` wrapper; max-width ~280px on `lg+`; hidden on very narrow viewports if cramped.

#### `src/components/shell/HeaderNavLinks.tsx`
**Purpose:** Row of icon-only nav buttons.
**Items:**
- Home → `<Link to="/">`; active when `useMatchRoute()({ to: "/", fuzzy: false })`.
- Friend-request → `<Link to="/friend-requests">`; active when `useMatchRoute()({ to: "/friend-requests", fuzzy: false })`. (URL is `/friend-requests` because `_app.tsx` is a pathless layout — the underscore prefix means the segment is not in the URL.)
- Messages → `<button type="button">` → `toast.info("Messages coming soon")`.
**Active style:** swaps icon stroke from `#666` to `var(--primary)` and adds a subtle bg pill (`bg-accent`).

#### `src/components/shell/NotificationsBell.tsx`
**Purpose:** Bell with red "6" badge, opens a dropdown panel.
**Props:** none.
**Behavior:** Renders `<DropdownMenu>` from shadcn. Trigger is the bell button with absolute-positioned "6" badge.
**Inside `<DropdownMenuContent className="w-[380px] p-0">`:**
1. Header row: title "Notifications" + a tiny three-dot menu (visual only; opens nothing — `toast.info` on click).
2. Tab buttons "All" / "Unread" (visual only — clicking flips active style but does nothing else; both render the full sample list).
3. `<ScrollArea className="h-[420px]">` of `<NotificationRow />`s mapped from `SAMPLE_NOTIFICATIONS`.

Closing the dropdown is the standard Radix behavior (outside click, Esc).

#### `src/components/shell/NotificationRow.tsx` (private to NotificationsBell)
**Props:** `{ actorName, actorAvatar, text, timeAgo }`.
**Renders:** avatar + text (actor name styled with `font-medium text-foreground`, rest `text-muted-foreground`) + timeAgo small text. Whole row is a `<button>` → `toast.info("Open notification coming soon")`.

#### `src/components/shell/AvatarMenu.tsx`
**Purpose:** User avatar opening a dropdown with Profile / Settings / Logout.
**Reads:** `user` from `useAuthStore`. If `user` is null (which shouldn't happen inside `_app` per the auth guard, but defensive), renders a disabled avatar with initials "?".
**Avatar:** shadcn `<Avatar>` with `<AvatarImage src={user.avatarUrl ?? undefined} />` + `<AvatarFallback>{firstInitial}{lastInitial}</AvatarFallback>`.
**Dropdown items:**
- Header row (non-interactive): full name + email small.
- `<Separator />`
- "Profile" → `toast.info("Profile coming soon")`.
- "Settings" → `toast.info("Settings coming soon")`.
- `<Separator />`
- "Logout" → calls `logoutCurrentDevice()` from `@/lib/auth`. Real behavior.

#### `src/components/shell/FloatingThemeToggle.tsx`
**Purpose:** Sample's `_layout_mode_swithing_btn` — fixed-position pill toggle on the left edge.
**Reads:** `useThemeStore`.
**Behavior:** Click → `useThemeStore.getState().toggle()`. The store setter handles class + storage.
**Position:** `fixed left-4 top-1/2 -translate-y-1/2 z-50 rounded-full bg-foreground/90 text-background shadow-lg`. Width ~56px, height ~32px; inner round indicator slides from left (light) to right (dark). Sun icon on one side, moon on the other.

### Left sidebar

#### `src/components/shell/LeftSidebar.tsx`
**Purpose:** Composes the three left-column cards with `space-y-6`.
**Renders:**
```tsx
<div className="space-y-6">
  <ExploreCard />
  <SuggestedPeopleCard />
  <EventsCard />
</div>
```

#### `src/components/shell/cards/ExploreCard.tsx`
**Purpose:** Sample's "Explore" link list.
**Source:** `EXPLORE_LINKS` from `data/sample-shell.ts`.
**Container:** `rounded-lg bg-card p-6` (matches sample's `_b_radious6 _padd_*`).
**Header:** `<h4 className="text-base font-semibold mb-6">Explore</h4>`.
**Row:** Icon + label + optional "New" pill (text-xs primary bg-primary/10). Each row is a `<button type="button">` → `toast.info(`${label} coming soon`)`.
**Icon lookup:** A small `iconName → JSX` map inside the card file (uses `icons/index.tsx`).

#### `src/components/shell/cards/SuggestedPeopleCard.tsx`
**Purpose:** Sample's "Suggested People" card.
**Source:** `SAMPLE_SUGGESTED_PEOPLE`.
**Header:** Title "Suggested People" + "See All" link → `toast.info`.
**Row:** `<Avatar>` + name (medium) + title (muted small) + `<Button variant="link" size="sm">Connect</Button>` → `toast.info("Friend request coming soon")`. (Phase C will rewire this `onClick` to `useSendFriendRequest({ data: { recipientId } })`.)

#### `src/components/shell/cards/EventsCard.tsx`
**Purpose:** Sample's "Events" card.
**Source:** `SAMPLE_EVENTS`.
**Header:** Title "Events" + "See all" link → `toast.info`.
**Row:** Image (top), then date pill (day + month stacked) + title; `<Separator />`; "X People Going" + `<Button variant="link" size="sm">Going</Button>` → `toast.info`. Whole card is clickable but routes nowhere — `toast.info`.

### Right sidebar

#### `src/components/shell/RightSidebar.tsx`
**Purpose:** Composes the two right-column cards with `space-y-6`.
**Renders:**
```tsx
<div className="space-y-6">
  <YouMightLikeCard />
  <YourFriendsCard />
</div>
```

#### `src/components/shell/cards/YouMightLikeCard.tsx`
**Purpose:** Sample's "You Might Like" — single profile with Ignore/Follow.
**Source:** `SAMPLE_YOU_MIGHT_LIKE[0]`.
**Header:** Title "You Might Like" + "See All" link → `toast.info`.
**Body:** `<Avatar>` + name + title (centered), then two side-by-side `<Button>`s: "Ignore" (outline) + "Follow" (default/primary). Both `toast.info`. Phase C will rewire "Follow" to `useSendFriendRequest`.

#### `src/components/shell/cards/YourFriendsCard.tsx`
**Purpose:** Sample's "Your Friends" — searchable scrollable list with status indicators.
**Source:** `SAMPLE_FRIENDS`.
**Structure:**
- Header: title "Your Friends" + "See All" link → `toast.info`.
- Sticky search input (decorative; `onSubmit` and `onChange` fire `toast.info("Search coming soon")`).
- `<ScrollArea className="max-h-[420px]">` of friend rows.
- Each row: `<Avatar>` + name (medium) + title (muted small) + right-side status: green dot when `status === "online"`, otherwise `<span className="text-xs text-muted-foreground">{lastSeen}</span>`. Whole row is a `<button>` → `toast.info("Open chat coming soon")`.

### Center column stubs (Phase B)

The current `_app/index.tsx` route renders three stacked blocks so the center column visibly fills the grid during Phase B. Phase C deletes the composer + feed stubs and replaces them with live versions.

#### `src/components/shell/center-stubs/StoriesCarousel.tsx`
**Purpose:** Sample's stories tray.
**Source:** `SAMPLE_STORIES`.
**Structure:** Row of 4 story tiles (`Your Story` first, then three friends). Each tile ~110×140px with avatar background and label at bottom. Right-edge arrow button → `toast.info("Carousel scroll coming soon")`.

#### `src/components/shell/center-stubs/ComposerPlaceholder.tsx`
**Purpose:** Visual-mass placeholder for the eventual Phase C composer.
**Reads:** `user` from `useAuthStore` (just to show its avatar).
**Structure:** A card with `<Avatar>` + `<button type="button">What's on your mind?</button>` (occupies the rest of the row) + image-upload icon button on the right. All controls fire `toast.info("Composer arrives in Phase C")`.

#### `src/components/shell/center-stubs/FeedPlaceholder.tsx`
**Purpose:** A single skeleton-style post card so the column has visible weight.
**Structure:** Card with grey skeleton bars (no animation needed) and copy "Feed list arrives in Phase C." centered.

### Routes

#### `src/routes/_app.tsx` (modified)
Component body replaces the inline `<div className="min-h-screen flex flex-col">…</div>` with `<AppLayout />`. The `beforeLoad` auth guard is untouched.

#### `src/routes/_app/index.tsx` (modified)
Body switches from the bare "Feed coming soon" card to:
```tsx
<div className="space-y-6">
  <StoriesCarousel />
  <ComposerPlaceholder />
  <FeedPlaceholder />
</div>
```

#### `src/routes/_app/friend-requests.tsx` (created — placeholder)
```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/friend-requests")({
  component: () => (
    <div className="rounded-lg bg-card p-6">
      <h1 className="text-xl font-semibold">Friend requests</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Incoming and outgoing requests will appear here in Phase C.
      </p>
    </div>
  ),
})
```

No other route additions in Phase B.

## Data Flow

| Source of truth | Consumers | When it changes |
|---|---|---|
| `useAuthStore.user` | `AvatarMenu` (avatar + initials + dropdown header), `ComposerPlaceholder` (avatar only) | Login (Phase A), logout, cold-boot `initializeAuth` |
| `useThemeStore.theme` | `FloatingThemeToggle` (icon state), `<html>` class via `applyTheme` side-effect inside the store setter | User clicks toggle; cold boot bootstraps from `localStorage` via no-flash script + store init |
| `useMatchRoute()` (from `@tanstack/react-router`) | `HeaderNavLinks` (active style) | Route changes |
| `SAMPLE_*` constants | All decorative cards | Never — static for Phase B |

**No new queries, mutations, or query-client interactions in Phase B.** The QueryClient set up in Phase A is unchanged. No new `useQuery` or `useMutation` calls.

## Error Handling

| Surface | Strategy |
|---|---|
| `AvatarMenu` → Logout failure (network down) | Already handled inside `logoutCurrentDevice` (best-effort revoke; always clears local state). No change. |
| Theme toggle | Pure local; if `localStorage` throws (incognito quota etc.) the setter swallows and continues in-memory. No toast — the user sees the click work anyway. |
| `Avatar` image 404 (broken `avatarUrl`) | shadcn `<AvatarFallback>` shows initials. Standard behavior. |
| Sample images 404 (typo'd path) | `<img>` falls back to `alt` text. Alt is meaningful, so not a user-visible regression. |
| Decorative `toast.info` actions | All target the same sonner singleton; duplicate-clicks dedup by sonner default. |

No new error boundaries needed.

## Testing Strategy

No automated tests in Phase B — surface is mostly composition of static markup with one stateful slice (theme). Manual gate suffices, same approach as Phase A.

**Pre-req:** A known test account exists; backend running at `http://localhost:8787`.

**Manual smoke gate** (all must pass before declaring Phase B complete):

1. `pnpm typecheck && pnpm lint` — both 0 errors.
2. `pnpm dev` — no console errors, no missing-asset 404s in network tab.
3. **Cold-boot logged out** → redirects to `/auth/login` (unchanged from Phase A).
4. **Cold-boot logged in (existing refresh cookie)** → lands on `/`, three-column shell renders with all cards populated, sticky header, floating theme toggle visible on left edge.
5. **Visual parity at 1440px** — open `sample_screens/feed.html` in a second tab. Compare side-by-side: header row (logo, search, nav icons, bell, avatar), left sidebar three cards (Explore, Suggested People, Events), right sidebar two cards (You Might Like, Your Friends), center column stub block (stories, composer placeholder, feed placeholder). Materially indistinguishable. Tweak Tailwind classes per-component until it matches. Common tweaks: card padding (~24px), border-radius (~6–8px), card shadows (subtle or none), font sizes.
6. **Active nav state** — clicking Home shows active style; clicking Friend-request navigates to `/friend-requests` (placeholder page renders) and that icon now shows active. Browser back returns to `/`.
7. **Avatar menu** — opens dropdown showing current user's name + email. "Profile" + "Settings" each fire one toast and do not navigate. "Logout" → revokes session, redirects to `/auth/login`.
8. **Notifications bell** — clicking opens the dropdown with sample rows, "All / Unread" tabs visible but do nothing semantically, scrolling inside the dropdown works, clicking any row fires `toast.info`.
9. **Theme toggle** —
   - Click floating button → background turns dark; all cards/text/borders update without visual breakage; the toggle's indicator slides to the dark side.
   - Reload page → stays dark; no light flash on cold load (no-flash script working).
   - Click again → back to light; persists across reload.
   - (Bonus) Open `/auth/login` while in dark mode — should render acceptably (not required to be a hard pass; auth pages aren't a Phase B target but they shouldn't crash).
10. **Search bar** — typing in the header search input works locally (controlled state); submitting (Enter) fires `toast.info("Search coming soon")`. Same for the friends-list search input.
11. **Sidebar interactions** — every Explore link, every Connect button, every Ignore/Follow button, every Events "Going" button, every Your-Friends row click fires the expected `toast.info`. No console errors.
12. **Responsive `<lg`** — sidebars vanish from the grid, center column becomes full-width, header collapses gracefully (icons still visible; search bar may hide if cramped — acceptable). Floating theme toggle still works.
13. **Stories carousel** — renders four sample story tiles; arrow button fires `toast.info`.
14. **Composer placeholder + feed placeholder** — both render with realistic visual mass; clicking the composer or its image button fires the Phase-C-coming-soon toast.
15. **No regressions** — sign out, log back in via `/auth/login` (Phase A flow), land on the new shell, repeat the dark-mode preference check. Multi-tab logout still propagates (BroadcastChannel unaffected).

Final commit (if any visual tweaks were needed during steps 5–14): `fix(shell): visual tweaks from smoke pass`.

## Build / Execution Sequence

Order matters: later steps import from earlier ones. Each step ends in a small, reviewable commit.

1. **shadcn primitives.** `pnpm dlx shadcn@latest add dropdown-menu avatar scroll-area separator --yes`. Pulls Radix peers. Typecheck → 0 errors. Commit `chore(ui): add dropdown-menu, avatar, scroll-area, separator primitives`.
2. **Asset copy.** `mkdir -p public/shell && cp …` (see §Architectural Decisions for the list). Commit `chore(assets): copy shell illustrations from sample_screens`.
3. **Theme module.** Create `src/lib/theme.ts`, `src/hooks/use-theme.ts`. Append `:root.dark { … }` block to `src/index.css`. Add no-flash inline script to `index.html`. Typecheck. Commit `feat(theme): dark mode store, palette, and no-flash bootstrap`.
4. **Sample data.** Create `src/data/sample-shell.ts` with all `SAMPLE_*` constants. Typecheck. Commit `feat(shell): static sample data for placeholder cards`.
5. **Icons module.** Create `src/components/shell/icons/index.tsx` porting every inline SVG. Typecheck. Commit `feat(shell): icon components ported from sample`.
6. **Center stubs.** `src/components/shell/center-stubs/{StoriesCarousel,ComposerPlaceholder,FeedPlaceholder}.tsx`. Typecheck. Commit `feat(shell): center-column stubs (stories, composer, feed placeholders)`.
7. **Header components.** `SearchBar`, `HeaderNavLinks`, `NotificationsBell` (+ inner `NotificationRow`), `AvatarMenu`, `AppHeader`, `FloatingThemeToggle`. Typecheck. Commit `feat(shell): header (search, nav, notifications, avatar) + floating theme toggle`.
8. **Left sidebar.** `cards/ExploreCard`, `cards/SuggestedPeopleCard`, `cards/EventsCard`, then `LeftSidebar.tsx`. Typecheck. Commit `feat(shell): left sidebar (Explore, Suggested People, Events)`.
9. **Right sidebar.** `cards/YouMightLikeCard`, `cards/YourFriendsCard`, then `RightSidebar.tsx`. Typecheck. Commit `feat(shell): right sidebar (You Might Like, Your Friends)`.
10. **Layout root.** `AppLayout.tsx`. Typecheck. Commit `feat(shell): AppLayout composes header, sidebars, and outlet`.
11. **Wire routes.** Modify `routes/_app.tsx` body; rewrite `routes/_app/index.tsx` body; create `routes/_app/friend-requests.tsx`. Typecheck + lint. Commit `feat(routes): wire AppLayout, center stubs, friend-requests placeholder`.
12. **Smoke gate** (§Testing Strategy). Apply visual-tweak commits as needed.

## Open Items / Risks

- **Dark palette tuning.** Tokens listed are a sensible default; the smoke gate's step 9 may reveal contrast issues (e.g. card-on-background too close in luminance, or `--muted-foreground` too dim against `--card`). Adjust inline during the smoke step.
- **Icon SVG fidelity.** Sample SVGs are pasted verbatim. If any path renders wrong because the sample relied on Bootstrap-injected attributes (e.g. `fill="currentColor"`), normalize to `fill="currentColor"` and let the parent class set the color.
- **Sample CSS uses Poppins; we ship Inter.** Same call as Phase A — leave on Inter unless visual review flags. Tracked, not blocking.
- **`useMatchRoute` exactness.** `_app.tsx` is a pathless layout (underscore prefix), so `_app/friend-requests.tsx` resolves to the URL `/friend-requests` while the route ID stays `/_app/friend-requests`. `<Link to>` and `useMatchRoute({ to })` both consume the URL form (`/friend-requests`). Home active needs `fuzzy: false` to avoid being permanently active when on child routes. If TanStack Router's typed `to` rejects the URL form for any reason, fall back to the route ID `/_app/friend-requests` (both forms are accepted at runtime).
- **Notifications dropdown tabs (All/Unread)** are static. Clicking "Unread" doesn't filter the list — both tabs show the same `SAMPLE_NOTIFICATIONS`. This is intentional for Phase B. A reviewer who clicks "Unread" expecting filtering should not be alarmed; the dropdown header copy "Notifications" makes no promise to filter.
- **`@custom-variant dark` was wired in Phase A** — this spec adds the dark token block. Phase A's auth pages will render correctly in dark mode as a side effect; if a smoke-step finds them broken, log it but don't fix in Phase B (auth pages are not a Phase B target).
- **Mobile layout** — sidebars are hidden at `<lg`; we don't reproduce the sample's mobile drawer / off-canvas pattern. Phase B mobile is "header only, full-width center". Listed in Non-Goals; track as a Phase D candidate if mobile parity matters later.
- **Centralized `SAMPLE_*` data** — when Phase C arrives, the suggestions / you-might-like / your-friends cards rewire to real APIs. The corresponding `SAMPLE_*` constants in `data/sample-shell.ts` will be deleted in that phase. Notifications, events, stories likely remain sample-static until a backend exists for each.

# Social Feed — Frontend

A small social network UI: feed, posts, comments, friends, and friend requests. Single-page app talking to a separate backend over a typed OpenAPI client.

Live: https://social-feed-fe.alamin-cse15.workers.dev

## Tech Stack

- **React 19** + **TypeScript** (strict, no `any`, no suppressions)
- **TanStack Router** — file-based routing with route guards
- **TanStack Query** — server state, caching, optimistic updates
- **Zustand** — client-side auth state
- **ky** — HTTP client with interceptors
- **Kubb** — generates typed API clients, React Query hooks, and Zod schemas from the backend's `openapi.json`
- **Tailwind v4** + **shadcn/ui** — styling and component primitives
- **Zod** — env parsing and API response validation
- **Vite** — bundler and dev server
- **Vitest** — unit tests (jsdom)
- **Cloudflare Workers** — production hosting (static SPA via Wrangler)

## Features

- **Auth** — signup, login, silent refresh, logout, cross-tab sync
- **Feed** — infinite-scroll feed, create text/image posts, edit visibility, delete
- **Comments** — nested replies, edit, delete, likes, like-previews
- **Posts** — like / unlike, post-like previews
- **Friends** — send, accept, decline, cancel, unfriend
- **Friend Requests** — dedicated page (incoming + outgoing) and a sidebar card with inline Accept / Decline
- **Profiles** — public user profile, user posts list, edit own profile, avatar upload
- **Media** — direct-to-R2 image uploads via backend-issued presigned URLs
- **UI shell** — 3-column layout (left/right sidebars), suggested people, your friends, "You Might Like", light/dark theme with no-flash cold load

## Implementation Notes

### Auth

Access token lives only in memory (`src/lib/auth.ts`); the refresh token is an `httpOnly` cookie set by the backend. Every request runs with `credentials: "include"`.

The authenticated ky instance (`src/lib/api-client.ts`):

- `beforeRequest` attaches `Authorization: Bearer …`
- `afterResponse` catches 401, calls `tryRefreshToken()` (deduplicated via a shared promise so concurrent 401s don't fan out into N refresh calls), retries the original request, or clears state and redirects to login

A separate **bare** ky instance (`bareApiClient`) is used during bootstrap and inside the refresh/logout flow to avoid recursive interceptors.

Route guards live on the layout routes:

- `_app.tsx` runs `initializeAuth` (silent refresh + `/me`) on first load, then redirects unauthenticated users to `/auth/login`, preserving the requested path in `?redirect=`
- `auth.tsx` bounces already-authenticated users to a safe target
- `safeRedirectPath` sanitises the `?redirect=` param so it can't be used for open-redirects

### API layer (generated)

`pnpm api:generate` curls the backend's `/openapi.json` and runs Kubb against it. Output lands in `src/gen/api/` (gitignored from TypeScript via `tsconfig.exclude`):

- `clients/<op>.ts` — fetch wrappers
- `hooks/use<Op>.ts` — React Query hooks
- `types/`, `zod/`, `schemas/` — TS types, Zod schemas, raw JSON Schemas

A custom adapter (`src/lib/kubb-clients/create-client.ts`) maps ky's `Response`/`HTTPError` into Kubb's `RequestConfig` / `ApiError` shape so the generated hooks plug straight into TanStack Query.

**Nothing in `src/gen/` is hand-edited.** Domain logic that wraps a generated hook (post-success side effects, optimistic cache updates) lives in `src/features/<domain>/` — e.g. `features/auth/use-login.ts` wraps `gen/api/hooks/useLogin.ts` and stores the token + user state after success.

### Data flow / state

- **Server state** → TanStack Query (`staleTime: 5m`, `gcTime: 10m`, no retries on 401/403/404)
- **Client state** → Zustand (auth only)
- **Forms** → `@tanstack/react-form` + Zod (often the generated `gen/api/zod/` schemas)

Mutations use **optimistic updates** wherever the UX benefits: friend request accept/decline/cancel/unfriend immediately mutate the cached friend & request lists, then roll back on error (with a toast and a refetch for 409 conflicts). See `src/features/friends/friends-cache.ts` for the shared cache helpers.

### Routing

File-based via `@tanstack/router-plugin`. Two top-level groups under `__root.tsx`:

- `_app.tsx` — authenticated layout (3-column shell), child routes in `src/routes/_app/`
- `auth.tsx` — `/auth/login`, `/auth/signup`

`routeTree.gen.ts` is generated on save and never edited by hand.

### UI

- Tailwind v4 via `@tailwindcss/vite` and a single global stylesheet (`src/index.css`)
- shadcn/ui (new-york, slate base) under `src/components/ui/`
- Reusable shell pieces in `src/components/shell/` (sidebars, cards, header, theme toggle)
- Light/dark theme: cold-load `<script>` in `index.html` reads `localStorage.theme` before paint to prevent FOUC; runtime helpers in `src/lib/theme.ts`
- Conditional classes through `cn()` (`clsx + tailwind-merge`)

### Env

All `import.meta.env` access goes through `src/lib/env/index.ts`, which validates a Zod schema at module load. Adding a new public var means extending `EnvSchema` and prefixing it with `VITE_`. `VITE_API_URL` defaults to `/api`, which Vite proxies to `http://localhost:8787` in dev.

### Type / lint discipline

- `tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `noUncheckedSideEffectImports`, `isolatedModules`
- No `any`, no unsafe casts, no `!` non-null assertions
- No `eslint-disable` / `@ts-expect-error` / `@ts-ignore` anywhere
- External data is parsed (Zod) at boundaries, not cast
- `pnpm typecheck` and `pnpm lint` must pass clean — the build gates on `tsc -b`

## Local Development

```bash
pnpm install
pnpm dev               # vite dev server on :3000, proxies /api/* to :8787
```

The backend dev server must be running on `http://localhost:8787`. Regenerate the API layer after backend changes:

```bash
pnpm api:generate      # fetch openapi.json + run kubb
```

Other scripts:

```bash
pnpm typecheck         # tsc -b
pnpm test              # vitest
pnpm lint              # eslint
pnpm format            # prettier --write + eslint --fix
pnpm build             # tsc -b && vite build
pnpm run deploy        # build + wrangler deploy
```

## Project Structure

```
src/
  routes/              file-based routes (TanStack Router)
    _app/              authenticated pages
    auth/              login + signup
  components/
    ui/                shadcn/ui primitives
    shell/             3-column layout, sidebars, cards
    friends/           friend rows + friendship buttons
  features/<domain>/   domain hooks (auth, feed, friends, media, profile)
  gen/api/             generated Kubb clients + hooks + types (gitignored)
  lib/                 ky clients, env, query client, utils
  hooks/               cross-cutting hooks (auth store, theme)
```

## Deploying

```bash
pnpm run deploy        # builds and publishes to Cloudflare Workers
```

Production env vars go through `wrangler secret put` (for secrets) or `wrangler.jsonc` `vars` (for public).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager: **pnpm** (see `pnpm-lock.yaml`). npm scripts work too.

- `pnpm dev` — Vite dev server on port 3000 (proxies `/api/*` → `http://localhost:8787`)
- `pnpm build` — `tsc -b && vite build` (typecheck gates the build)
- `pnpm typecheck` — `tsc -b` only
- `pnpm test` — Vitest (jsdom env, `*.test.ts(x)` files; route plugin ignores test files via `routeFileIgnorePattern`)
- Run a single test: `pnpm test -- src/path/to/file.test.tsx` or `pnpm test -- -t "test name"`
- `pnpm lint` / `pnpm format` / `pnpm check` — eslint / prettier-write+eslint-fix / prettier-check
- `pnpm api:generate` — `fetch-specs` (curls `http://localhost:8787/openapi.json` into `specs/api.json`) then `kubb generate` into `src/gen/api/`. Run `pnpm generate` alone if the spec is already fresh. **The backend dev server must be running on :8787 for `fetch-specs`.**
- `pnpm deploy` — `pnpm build && wrangler deploy` (Cloudflare Workers; SPA assets served from `./dist`)

## Architecture

**Stack:** React 19 + TanStack Start (Router + Query) + Vite + Tailwind v4 + shadcn/ui (new-york, slate base) + Zustand + ky + Kubb (OpenAPI codegen) + Cloudflare Workers (SPA-style static hosting via `wrangler.jsonc`).

**Path alias:** `@/*` → `src/*` (configured in both `tsconfig.json` and `vite.config.ts`).

### Routing (`src/routes/`)

File-based via `@tanstack/router-plugin`. `routeTree.gen.ts` is auto-generated — don't edit. The route tree has two top-level branches under `__root.tsx`:

- **`_app.tsx`** — pathless layout group. `beforeLoad` redirects to `/auth/login` if not authenticated, preserving the current path as a `redirect` search param. Children live in `src/routes/_app/` and render inside `AppLayout` (3-column shell: `LeftSidebar` | `Outlet` | `RightSidebar`).
- **`auth.tsx`** — `/auth/*` group. `beforeLoad` bounces authenticated users to a safe redirect target or `/`. Children (`login.tsx`, `signup.tsx`) render inside `AuthLayout`.

`__root.tsx` runs `initializeAuth` in `beforeLoad` (tries silent refresh + `/me` fetch on cold load) and subscribes to a `BroadcastChannel("auth")` to handle cross-tab logout.

### Auth flow

- **Access token** is held in memory only (`src/lib/auth.ts`). The refresh token is an httpOnly cookie — every request uses `credentials: "include"`.
- **`api` (`src/lib/api-client.ts`)** is the authenticated ky instance. `beforeRequest` attaches `Authorization: Bearer …`; `afterResponse` catches 401 on non-auth endpoints, calls `tryRefreshToken()` (deduplicated via a shared promise), retries the original request, or clears auth and redirects to login on failure. `beforeError` toasts only on network/timeout errors.
- **`bareApiClient` (`src/lib/kubb-clients/bare-api-client.ts`)** is a no-hooks ky instance used during bootstrap (`initializeAuth`) and inside the refresh/logout flow to avoid recursive interceptors.
- **`useAuthStore`** (Zustand, `src/hooks/use-auth.ts`) tracks `user`, `isAuthenticated`, `isInitialized`. It is the source of truth route guards consult.
- `safeRedirectPath` / `buildLoginRedirectSearch` (`src/lib/auth-redirect.ts`) sanitize the `?redirect=` param to prevent open-redirect.

### API layer (Kubb codegen)

`kubb.config.ts` reads `specs/api.json` and writes to `src/gen/api/` (which is gitignored from tsconfig: `exclude: ["src/gen/**"]`). Layout:

- `gen/api/clients/<op>.ts` — fetch wrappers (use `import("@/gen/api/clients/<op>.ts")`)
- `gen/api/hooks/use<Op>.ts` + `use<Op>Suspense.ts` — React Query hooks
- `gen/api/types/`, `gen/api/zod/`, `gen/api/schemas/` — generated TS types, Zod schemas, raw JSON Schemas

**Never hand-edit `src/gen/**`.** After backend changes, regenerate with `pnpm api:generate`. The custom Kubb adapter is `src/lib/kubb-clients/create-client.ts` — it converts ky responses/errors into Kubb's `RequestConfig`/`ResponseConfig`/`ApiError` shape and serializes `params` as URLSearchParams. The generated clients import their HTTP client from `@/lib/kubb-clients/api-client` by default (see `importPath` in `kubb.config.ts`).

### Data / state

- **TanStack Query** (`src/lib/query-client.ts`): `staleTime: 5m`, `gcTime: 10m`, no retries on 401/403/404. Devtools mounted in `main.tsx`.
- **Zustand** for auth (and any future client-only state). Server state goes through React Query / Kubb hooks.
- Forms use `@tanstack/react-form` + Zod schemas (often the generated ones in `gen/api/zod/`).

### UI

- **Tailwind v4** via `@tailwindcss/vite` plugin. Single global stylesheet at `src/index.css`.
- **shadcn/ui** components live in `src/components/ui/` (style: new-york, base: slate, CSS variables). Use `pnpm dlx shadcn@latest add <component>` to add more — config in `components.json`.
- **Theme**: light/dark via `.dark` class on `<html>`. Cold-load script in `index.html` reads `localStorage.theme` before paint to avoid FOUC. Runtime helpers in `src/lib/theme.ts` + `src/hooks/use-theme.ts`. Toggle via `<FloatingThemeToggle />`.
- `cn()` (`src/lib/utils.ts`) — `clsx + tailwind-merge`. Use it for conditional class composition.
- Icons: lucide-react (`src/components/shell/icons/index.tsx` for shared icon set).

### Environment

`src/lib/env/index.ts` parses `import.meta.env` with Zod. Add new vars by extending `EnvSchema` (prefix with `VITE_`). `VITE_API_URL` defaults to `/api` (the Vite dev proxy target). Don't read `import.meta.env` directly elsewhere — go through `env`.

### Feature organization

- `src/components/` — presentational + shell layout components (`auth/`, `shell/`, `ui/`).
- `src/features/<domain>/` — feature-specific logic: form components, mutation hooks wrapping generated hooks (e.g. `features/auth/use-login.ts` wraps `gen/api/hooks/useLogin.ts` and handles post-success token/state side-effects).
- `src/hooks/` — cross-cutting hooks (auth store, theme).
- `src/lib/` — non-React utilities, clients, env.
- `src/data/` — static sample data used by the shell stubs.

## Conventions

- Prettier: no semicolons, single quotes, trailing commas everywhere.
- ESLint extends `@tanstack/eslint-config`. `import/order` and `sort-imports` are intentionally off — don't reorder imports as a drive-by cleanup.
- **Strict type-checking applies project-wide (non-negotiable).** Current `tsconfig.json` already enables `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`, `verbatimModuleSyntax`, `forceConsistentCasingInFileNames`, `isolatedModules`. These flags are the floor, not the ceiling — do not weaken them. On top of that:
  - **No `any`.** Ever. Use `unknown` at boundaries (parsed JSON, error catches, foreign data) and narrow with type guards, `instanceof`, `in`, or Zod parsing before use.
  - **No unsafe casts.** No `as any`, no `as unknown as T` chains, no `!` non-null assertions to silence the compiler. If a value might be missing, prove it isn't with a guard or runtime check.
  - **`import type` for type-only imports** (required by `verbatimModuleSyntax`).
  - **External / untyped data must be parsed**, not cast. Validate API responses through the generated `gen/api/zod/` schemas (or a hand-written Zod schema) before using them as typed values.
  - **`pnpm typecheck` must pass clean** — zero errors, zero warnings. The build (`pnpm build`) gates on `tsc -b`, so a broken type-check breaks the build.
- **Lint discipline (strict, no exceptions):** never silence the linter or the type-checker. Do **not** add `// eslint-disable`, `// eslint-disable-next-line`, `// eslint-disable-line`, `/* eslint-disable */`, `// @ts-expect-error`, `// @ts-ignore`, or `// @ts-nocheck` anywhere. Every ESLint error and every TypeScript error must be fixed at the source — rewrite the code, narrow the types, or restructure the call. If a rule appears truly wrong for the codebase, raise it explicitly with the user and change the config instead of suppressing per-line. `pnpm lint` and `pnpm typecheck` must pass clean before any work is reported done.
- File-based routes mean **adding a route = adding a file** under `src/routes/`. The plugin regenerates `routeTree.gen.ts` on save.
- Plans and design specs (when present) live under `docs/superpowers/{plans,specs}/`.

## Backend integration

This repo is the frontend only. It expects a backend on `http://localhost:8787` exposing `/openapi.json` and the operations referenced in `specs/api.json` (auth: `login`, `signup`, `refresh`, `logout`, `getCurrentUser`; social: feed, posts, comments, friends, presigned uploads, health). The Vite dev server proxies `/api/*` to that origin and strips the `/api` prefix.

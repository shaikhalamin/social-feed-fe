# Frontend Infrastructure Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TanStack Start scaffold with a Vite SPA wired for combined `/api` proxy, Kubb-generated typed client, ky-based HTTP with refresh-token retry, minimal Zustand auth store, and route shells for `/auth/*` and authenticated `/`. No feature UI is built — output is a project that boots, bootstraps auth, and routes the user to either the login screen or the empty feed shell.

**Architecture:** Single ky instance with auth-aware hooks proxies through Vite (`/api/*` → `localhost:8787`, `/api` stripped). Kubb generates one typed client tree at `src/gen/api/` from `http://localhost:8787/docs`. Access token lives in a module-level `let`; refresh token is an HttpOnly cookie auto-attached via `credentials: "include"`. Cross-tab logout via `BroadcastChannel`. Auth state mirrored into a minimal Zustand store for synchronous reads in route guards.

**Tech Stack:** Vite 8, React 19, TypeScript 6, TanStack Router, TanStack Query, Zustand, ky, zod 4, Kubb (oas + ts + zod + client + react-query plugins), sonner, Tailwind CSS 4.

**Reference project (read-only context):** `/home/shaikh/my_projects/hono_project_payroll_saas/hr-payroll-saas-fe` — mirrors all patterns used here.

**Spec:** `docs/superpowers/specs/2026-05-12-frontend-infrastructure-setup-design.md`

**Conventions:**
- Package manager: **pnpm** (matches reference; existing `package.json` has `pnpm.onlyBuiltDependencies` block).
- TypeScript path alias: `@/*` → `./src/*`.
- Commit style: short imperative subject, scoped prefix (`chore:`, `feat:`, `refactor:`).
- Run typecheck (`pnpm typecheck`) after every task as the equivalent of "test passes." It must report 0 errors before committing.
- No automated tests in this phase. Vitest stays installed for future use.

---

## File Structure (target end state)

```
social-feed-fe/
├── index.html                              [NEW]
├── kubb.config.ts                          [NEW]
├── package.json                            [MODIFIED — deps & scripts]
├── tsconfig.json                           [MODIFIED — paths]
├── vite.config.ts                          [REWRITTEN]
├── scripts/
│   └── fetch-specs.sh                      [NEW]
├── specs/
│   └── api.json                            [GENERATED — committed]
├── src/
│   ├── main.tsx                            [NEW]
│   ├── index.css                           [NEW — renamed from styles.css, minimal]
│   ├── router.tsx                          [DELETE]
│   ├── styles.css                          [DELETE]
│   ├── components/
│   │   ├── Header.tsx                      [DELETE]
│   │   ├── Footer.tsx                      [DELETE]
│   │   └── ThemeToggle.tsx                 [DELETE]
│   ├── lib/
│   │   ├── env/
│   │   │   └── index.ts                    [NEW]
│   │   ├── api-error.ts                    [NEW]
│   │   ├── api-client.ts                   [NEW]
│   │   ├── auth.ts                         [NEW]
│   │   ├── auth-init.ts                    [NEW]
│   │   ├── auth-redirect.ts                [NEW]
│   │   ├── query-client.ts                 [NEW]
│   │   └── kubb-clients/
│   │       ├── create-client.ts            [NEW]
│   │       ├── api-client.ts               [NEW]
│   │       └── bare-api-client.ts          [NEW]
│   ├── hooks/
│   │   └── use-auth.ts                     [NEW]
│   ├── gen/
│   │   └── api/                            [GENERATED — committed]
│   └── routes/
│       ├── __root.tsx                      [REWRITTEN]
│       ├── about.tsx                       [DELETE]
│       ├── index.tsx                       [DELETE]
│       ├── auth.tsx                        [NEW]
│       ├── auth/
│       │   ├── login.tsx                   [NEW]
│       │   └── signup.tsx                  [NEW]
│       ├── _app.tsx                        [NEW]
│       └── _app/
│           └── index.tsx                   [NEW]
```

---

## Task 1: Tear down TanStack Start scaffold

Strip the SSR meta-framework and demo content so the next task can rebuild as a pure Vite SPA.

**Files:**
- Delete: `src/router.tsx`, `src/styles.css`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/ThemeToggle.tsx`, `src/routes/about.tsx`, `src/routes/index.tsx`, `src/routes/__root.tsx`
- Modify: `package.json` (remove SSR-only deps; do NOT add new deps yet — that's Task 2)

- [ ] **Step 1: Verify the files exist before deleting**

Run: `ls src/router.tsx src/styles.css src/components/ src/routes/`
Expected: each path exists; `src/components/` contains `Header.tsx`, `Footer.tsx`, `ThemeToggle.tsx`; `src/routes/` contains `__root.tsx`, `about.tsx`, `index.tsx`.

- [ ] **Step 2: Delete the obsolete files**

Run:
```bash
rm src/router.tsx src/styles.css
rm src/components/Header.tsx src/components/Footer.tsx src/components/ThemeToggle.tsx
rmdir src/components
rm src/routes/__root.tsx src/routes/about.tsx src/routes/index.tsx
```

Expected: no output. `ls src/` shows only `routes/` (now empty).

- [ ] **Step 3: Remove SSR-only deps from `package.json`**

Open `package.json`. Delete these lines from `"dependencies"`:
- `"@tanstack/react-devtools": "latest",`
- `"@tanstack/react-router-ssr-query": "latest",`
- `"@tanstack/react-start": "latest",`

Delete these lines from `"devDependencies"`:
- `"@tanstack/devtools-vite": "latest",`

(Other deps stay — they will be augmented in Task 2.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: tear down TanStack Start scaffold

Strip the SSR meta-framework, demo routes, and starter components.
Prepares the project for a pure Vite SPA rebuild.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Add new dependencies and scripts; install

Add every package the new infrastructure depends on, plus the Kubb generation pipeline scripts.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Rewrite `package.json`**

Open `package.json` and replace its full contents with:

```json
{
  "name": "social-feed-fe",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 3000",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint",
    "format": "prettier --write . && eslint --fix",
    "check": "prettier --check .",
    "typecheck": "tsc -b",
    "fetch-specs": "bash scripts/fetch-specs.sh",
    "generate": "kubb generate",
    "api:generate": "pnpm fetch-specs && pnpm generate",
    "deploy": "pnpm build && wrangler deploy"
  },
  "dependencies": {
    "@cloudflare/vite-plugin": "^1.26.0",
    "@fontsource-variable/inter": "^5.2.8",
    "@tailwindcss/vite": "^4.1.18",
    "@tanstack/react-form": "^1.28.6",
    "@tanstack/react-query": "^5.96.2",
    "@tanstack/react-query-devtools": "^5.96.2",
    "@tanstack/react-router": "latest",
    "@tanstack/react-virtual": "^3.13.0",
    "@tanstack/router-plugin": "^1.132.0",
    "ky": "^2.0.0",
    "lucide-react": "^0.545.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "sonner": "^2.0.7",
    "tailwindcss": "^4.1.18",
    "zod": "^4.3.6",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@kubb/cli": "^4.37.2",
    "@kubb/core": "^4.37.2",
    "@kubb/plugin-client": "^4.37.2",
    "@kubb/plugin-oas": "^4.37.2",
    "@kubb/plugin-react-query": "^4.37.2",
    "@kubb/plugin-ts": "^4.37.2",
    "@kubb/plugin-zod": "^4.37.2",
    "@tailwindcss/typography": "^0.5.16",
    "@tanstack/eslint-config": "latest",
    "@tanstack/eslint-plugin-query": "^5.97.0",
    "@tanstack/eslint-plugin-router": "^1.161.6",
    "@tanstack/react-router-devtools": "latest",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^22.10.2",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^9.20.0",
    "jsdom": "^28.1.0",
    "prettier": "^3.8.1",
    "typescript": "^6.0.2",
    "vite": "^8.0.0",
    "vitest": "^4.1.5",
    "wrangler": "^4.70.0"
  },
  "pnpm": {
    "onlyBuiltDependencies": [
      "esbuild",
      "lightningcss"
    ]
  }
}
```

Changes from before: removed `@tanstack/react-devtools`, `@tanstack/react-router-ssr-query`, `@tanstack/react-start`, `@tanstack/devtools-vite`; added `ky`, `zod`, `zustand`, `sonner`, `@tanstack/react-form`, `@tanstack/react-virtual`, `@tanstack/react-query`, `@tanstack/react-query-devtools`, `@tanstack/eslint-plugin-query`, `@tanstack/eslint-plugin-router`, `@fontsource-variable/inter`, all `@kubb/*` deps; added scripts `typecheck`, `fetch-specs`, `generate`, `api:generate`, and replaced `deploy` to use pnpm.

- [ ] **Step 2: Delete `package-lock.json` (we're switching to pnpm)**

Run: `rm -f package-lock.json`

- [ ] **Step 3: Install dependencies**

Run: `pnpm install`
Expected: pnpm creates `pnpm-lock.yaml` and installs everything. No errors. If pnpm warns about peer dependency conflicts on `react@19` or `zod@4`, ignore them.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git rm -f package-lock.json 2>/dev/null || true
git commit -m "$(cat <<'EOF'
chore: add infrastructure dependencies and pnpm scripts

Add ky, zod, zustand, sonner, TanStack Query/Form/Virtual, and the full
Kubb plugin set. Switch from npm to pnpm (matches reference project).
Adds fetch-specs / generate / api:generate scripts for code-gen pipeline.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Vite config, tsconfig paths, `index.html`, minimal `index.css`

Rebuild the SPA entry. Single combined proxy. `@/*` path alias.

**Files:**
- Modify: `vite.config.ts`, `tsconfig.json`
- Create: `index.html`, `src/index.css`

- [ ] **Step 1: Rewrite `vite.config.ts`**

Open `vite.config.ts` and replace its full contents with:

```ts
import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import tanstackRouter from "@tanstack/router-plugin/vite"

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      enableRouteGeneration: true,
      routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
    }),
    react(),
    cloudflare(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
})
```

- [ ] **Step 2: Rewrite `tsconfig.json`**

Replace its full contents with:

```json
{
  "include": ["**/*.ts", "**/*.tsx", "eslint.config.js", "prettier.config.js", "vite.config.ts"],
  "exclude": ["node_modules", "dist", "src/gen/**"],
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "node"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "forceConsistentCasing": true,
    "resolveJsonModule": true
  }
}
```

Changes: drop `#/*` alias, keep only `@/*`. Exclude `src/gen/**` from typecheck (kubb output is generated; we don't want noise during iteration). Add `node` types for the proxy config.

- [ ] **Step 3: Remove `imports` field from `package.json`**

Open `package.json`. If it still contains the top-level `"imports": { "#/*": "./src/*" }` block (left over from Task 2), confirm it has been removed. The rewrite in Task 2 Step 1 already omits it; verify with `grep '"#/"' package.json` → no matches.

- [ ] **Step 4: Create `index.html`**

Create `index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Social Feed</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `src/index.css`**

Create `src/index.css` with minimal contents (no theme cruft — UI polish comes later):

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts tsconfig.json package.json index.html src/index.css
git commit -m "$(cat <<'EOF'
chore: vite SPA entry with combined /api proxy

Combined proxy maps /api/* to localhost:8787 with /api stripped.
TypeScript paths consolidated to @/* alias only. index.html and a
minimal index.css replace the SSR shellComponent setup.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Env validation module

Zod-validated `import.meta.env` with one API URL.

**Files:**
- Create: `src/lib/env/index.ts`

- [ ] **Step 1: Create `src/lib/env/index.ts`**

```ts
import { z } from "zod"

/**
 * Zod schema for the Vite env vars the app consumes. Defaults map to the
 * dev-server proxy path declared in `vite.config.ts`.
 */
const EnvSchema = z.object({
  VITE_API_URL: z.string().default("/api"),
  VITE_APP_NAME: z.string().default("Social Feed"),
})

function parseEnv(source: unknown): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ")
    throw new Error(`Invalid environment configuration: ${issues}`)
  }
  return result.data
}

const parsed = parseEnv(import.meta.env)

export const env = {
  apiUrl: parsed.VITE_API_URL,
  appName: parsed.VITE_APP_NAME,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

export { EnvSchema, parseEnv }
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/env/index.ts
git commit -m "$(cat <<'EOF'
feat: zod-validated env module

Single VITE_API_URL replaces the reference project's three URLs.
Fails fast at module load with a concatenated zod issue message.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `api-error.ts` and `query-client.ts`

Two small leaf modules. `api-error.ts` defines the error class and Kubb-compatible request/response/Client types. `query-client.ts` exposes the single `QueryClient`.

**Files:**
- Create: `src/lib/api-error.ts`, `src/lib/query-client.ts`

- [ ] **Step 1: Create `src/lib/api-error.ts`**

```ts
export class ApiError<TBody = unknown> extends Error {
  readonly name = "ApiError"
  readonly status: number
  readonly statusText: string
  readonly url: string
  readonly body: TBody

  constructor(params: {
    status: number
    statusText: string
    url: string
    body: TBody
    message: string
  }) {
    super(params.message)
    this.status = params.status
    this.statusText = params.statusText
    this.url = params.url
    this.body = params.body
  }
}

export type RequestConfig<TData = unknown> = {
  baseURL?: string
  url?: string
  method?:
    | "GET"
    | "PUT"
    | "PATCH"
    | "POST"
    | "DELETE"
    | "OPTIONS"
    | "HEAD"
  params?: unknown
  data?: TData | FormData
  responseType?:
    | "arraybuffer"
    | "blob"
    | "document"
    | "json"
    | "text"
    | "stream"
  signal?: AbortSignal
  headers?: HeadersInit
}

export type ResponseConfig<TData = unknown> = {
  data: TData
  status: number
  statusText: string
  headers?: Headers
}

export type ResponseErrorConfig<TError = unknown> = ApiError<TError>

export type Client = <
  TResponseData,
  TError = unknown,
  TRequestData = unknown,
>(
  config: RequestConfig<TRequestData> & { errorType?: TError }
) => Promise<ResponseConfig<TResponseData> & { errorType?: TError }>
```

- [ ] **Step 2: Create `src/lib/query-client.ts`**

```ts
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status: number } }).response
          ?.status
        if (status != null && [401, 403, 404].includes(status)) return false
        return failureCount < 2
      },
    },
  },
})
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api-error.ts src/lib/query-client.ts
git commit -m "$(cat <<'EOF'
feat: ApiError class and shared QueryClient

ApiError exposes status/body/url/message; types are shaped to be what
Kubb's generated clients expect (RequestConfig/ResponseConfig/Client).
QueryClient skips retries on 401/403/404 to avoid masking auth failures.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Kubb client adapter (`create-client.ts`)

Adapter from `KyInstance` to the `Client` function shape Kubb expects. Translates ky's `HTTPError` into `ApiError`.

**Files:**
- Create: `src/lib/kubb-clients/create-client.ts`

- [ ] **Step 1: Create the file**

```ts
import { HTTPError, type KyInstance } from "ky"
import {
  ApiError,
  type Client,
  type RequestConfig,
  type ResponseConfig,
  type ResponseErrorConfig,
} from "@/lib/api-error"

export type { RequestConfig, ResponseConfig, ResponseErrorConfig, Client }

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>
    if (typeof record.message === "string") return record.message
    if (typeof record.error === "string") return record.error
  }
  if (typeof body === "string" && body.length > 0) return body
  return fallback
}

function stringifyPrimitive(value: unknown): string | undefined {
  if (value == null) return undefined
  switch (typeof value) {
    case "string":
      return value
    case "number":
    case "boolean":
    case "bigint":
      return value.toString()
    default:
      return undefined
  }
}

function serializeSearchParams(params: unknown): string | undefined {
  if (params == null || typeof params !== "object") return undefined
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(
    params as Record<string, unknown>
  )) {
    if (value == null) continue
    if (Array.isArray(value)) {
      for (const v of value) {
        const s = stringifyPrimitive(v)
        if (s !== undefined) sp.append(key, s)
      }
    } else {
      const s = stringifyPrimitive(value)
      if (s !== undefined) sp.append(key, s)
    }
  }
  const result = sp.toString()
  return result.length ? result : undefined
}

export function createKubbClient(kyInstance: KyInstance): Client {
  return async (config) => {
    const isFormData = config.data instanceof FormData
    const searchParams = serializeSearchParams(config.params)
    const url = config.url ?? ""

    let response: Response
    try {
      response = await kyInstance(url, {
        method: config.method ?? "GET",
        ...(config.data
          ? isFormData
            ? { body: config.data as FormData }
            : { json: config.data }
          : {}),
        ...(searchParams ? { searchParams } : {}),
        ...(config.baseURL ? { prefix: config.baseURL } : {}),
        signal: config.signal ?? undefined,
        headers: config.headers,
      })
    } catch (error) {
      if (error instanceof HTTPError) {
        const body: unknown = error.data
        throw new ApiError({
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.response.url || url,
          body: body as never,
          message: extractMessage(
            body,
            `${error.response.status} ${error.response.statusText}`
          ),
        })
      }
      throw error
    }

    const hasBody =
      response.status !== 204 &&
      response.status !== 205 &&
      response.headers.get("content-length") !== "0"
    const contentType = response.headers.get("content-type") ?? ""
    const data: unknown = hasBody
      ? contentType.includes("application/json")
        ? ((await response.json()) as unknown)
        : await response.text()
      : undefined

    return {
      data: data as never,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    }
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/kubb-clients/create-client.ts
git commit -m "$(cat <<'EOF'
feat: ky-to-Kubb client adapter

createKubbClient(ky) returns the function shape Kubb's generated code
calls. Wraps HTTPError into ApiError, serializes search params, and
handles FormData vs JSON bodies and 204/no-body responses.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Kubb config and `fetch-specs.sh`

Configure single-API code generation. The script fetches the spec from the running backend.

**Files:**
- Create: `kubb.config.ts`, `scripts/fetch-specs.sh`

- [ ] **Step 1: Create `kubb.config.ts`**

```ts
import { defineConfig } from "@kubb/core"
import { pluginOas } from "@kubb/plugin-oas"
import { pluginTs } from "@kubb/plugin-ts"
import { pluginZod } from "@kubb/plugin-zod"
import { pluginClient } from "@kubb/plugin-client"
import { pluginReactQuery } from "@kubb/plugin-react-query"

export default defineConfig({
  name: "api",
  root: ".",
  input: { path: "./specs/api.json" },
  output: { path: "./src/gen/api", clean: true },
  plugins: [
    pluginOas({ validate: false }),
    pluginTs({
      output: { path: "types" },
      enumType: "asConst",
      dateType: "string",
    }),
    pluginZod({
      output: { path: "zod" },
      version: "4",
    }),
    pluginClient({
      output: { path: "clients" },
      importPath: "@/lib/kubb-clients/api-client",
      dataReturnType: "data",
      paramsType: "object",
      pathParamsType: "object",
    }),
    pluginReactQuery({
      output: { path: "hooks" },
      client: {
        importPath: "@/lib/kubb-clients/api-client",
        dataReturnType: "data",
      },
      suspense: {},
      paramsType: "object",
      pathParamsType: "object",
    }),
  ],
})
```

- [ ] **Step 2: Create `scripts/fetch-specs.sh`**

```bash
#!/usr/bin/env bash
# Fetches the OpenAPI JSON spec from the running backend dev server.
set -euo pipefail

SPECS_DIR="./specs"
mkdir -p "$SPECS_DIR"

echo "Fetching API OpenAPI spec from http://localhost:8787/docs ..."
curl -sf http://localhost:8787/docs -o "$SPECS_DIR/api.json"

echo "Spec fetched successfully."
```

- [ ] **Step 3: Make the script executable**

Run: `chmod +x scripts/fetch-specs.sh`

- [ ] **Step 4: Commit**

```bash
git add kubb.config.ts scripts/fetch-specs.sh
git commit -m "$(cat <<'EOF'
feat: kubb config and fetch-specs script

Single-spec generation into src/gen/api/{types,zod,clients,hooks}.
Generated clients import the default-exported Client from
@/lib/kubb-clients/api-client (created in a later task).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Run `pnpm api:generate` and capture generated function names

This is the first task that contacts the live backend. After generation, we inspect the generated client filenames so the next task imports the right names.

**Files:**
- Create (via generation): `specs/api.json`, `src/gen/api/**`

- [ ] **Step 1: Confirm the backend is reachable**

Run: `curl -sf -o /dev/null -w "%{http_code}\n" http://localhost:8787/docs`
Expected: `200`.

If not 200: ask the user to start the backend at `http://localhost:8787` before proceeding. Do not continue this task until the backend responds.

- [ ] **Step 2: Run the generation pipeline**

Run: `pnpm api:generate`
Expected: console shows "Fetching API OpenAPI spec…" then Kubb output listing files generated under `src/gen/api/`. No errors.

If generation fails:
- If error mentions OpenAPI validation: confirm `pluginOas({ validate: false })` is set in `kubb.config.ts`.
- If error mentions a specific operation: open `specs/api.json`, find the operation, share the error with the user — likely needs backend-side fix.
- If `curl: (7) Failed to connect`: backend isn't running. Restart and retry.

- [ ] **Step 3: List the generated client functions**

Run: `ls src/gen/api/clients/`
Expected: a list of `.ts` files, one per OpenAPI operation. Record the file names — particularly anything matching:
- `refreshToken` (or similar — e.g. `postAuthRefresh`, `authRefresh`)
- `logout` (or `postAuthLogout`)
- `getCurrentUser` / `getAuthMe` / `me` (whatever the `GET /auth/me` operation was named)

Note the **exact** filenames. They will be used as import specifiers in Tasks 10 and 11.

- [ ] **Step 4: Verify Kubb output structure**

Run: `ls src/gen/api/`
Expected output includes at minimum: `clients/`, `hooks/`, `types/`, `zod/`.

- [ ] **Step 5: Commit the generated artifacts**

```bash
git add specs/api.json src/gen/api
git commit -m "$(cat <<'EOF'
chore: generate API client from backend OpenAPI spec

Generated by 'pnpm api:generate' against http://localhost:8787/docs.
Commits both the spec snapshot and the generated client/hooks/types/zod
so the project is buildable without a running backend.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Bare API client, auth-redirect helper, Zustand auth store

Three leaf modules with no inter-dependency. `bare-api-client` is the unhooked Client used inside the auth flow. `auth-redirect` is pure logic. `use-auth` is the minimal Zustand store.

**Files:**
- Create: `src/lib/kubb-clients/bare-api-client.ts`, `src/lib/auth-redirect.ts`, `src/hooks/use-auth.ts`

- [ ] **Step 1: Create `src/lib/kubb-clients/bare-api-client.ts`**

```ts
import ky from "ky"
import { env } from "@/lib/env"
import { createKubbClient } from "./create-client"

export type {
  RequestConfig,
  ResponseConfig,
  ResponseErrorConfig,
  Client,
} from "./create-client"

const bareKy = ky.create({
  prefix: env.apiUrl,
  credentials: "include",
})

const client = createKubbClient(bareKy)

export default client
```

- [ ] **Step 2: Create `src/lib/auth-redirect.ts`**

```ts
const AUTH_ROUTES = new Set(["/auth/login", "/auth/signup"])

function pathnameOf(value: string): string {
  const q = value.indexOf("?")
  return q === -1 ? value : value.slice(0, q)
}

export function safeRedirectPath(
  value: string | undefined | null
): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (trimmed === "") return null
  if (!trimmed.startsWith("/")) return null
  if (trimmed.startsWith("//")) return null
  if (trimmed.startsWith("/\\")) return null
  const pathname = pathnameOf(trimmed).replace(/\/$/, "") || "/"
  if (AUTH_ROUTES.has(pathname)) return null
  return trimmed
}

export function buildLoginRedirectSearch(
  currentPathWithSearch: string
): { redirect?: string } {
  const safe = safeRedirectPath(currentPathWithSearch)
  if (!safe) return {}
  if (safe === "/") return {}
  return { redirect: safe }
}
```

- [ ] **Step 3: Create `src/hooks/use-auth.ts`**

```ts
import { create } from "zustand"

export type AuthUser = {
  id: string
  username: string
  email: string
  // Tightened to the kubb-generated User type in a follow-up commit once
  // the precise shape from the backend is confirmed.
}

type AuthState = {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitialized: boolean
  setUser: (user: AuthUser | null) => void
  setInitialized: (value: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  setUser: (user) => set({ user, isAuthenticated: user !== null }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  reset: () => set({ user: null, isAuthenticated: false }),
}))
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kubb-clients/bare-api-client.ts src/lib/auth-redirect.ts src/hooks/use-auth.ts
git commit -m "$(cat <<'EOF'
feat: bare api client, redirect helper, zustand auth store

bare-api-client has no auth hooks — used by refresh/logout/me bootstrap
to avoid the 401-retry recursion. auth-redirect prevents open redirects
and auth-route loops. useAuthStore is minimal: user + isAuthenticated
+ isInitialized.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: `auth.ts` (token, refresh, logout, broadcast)

Owns the in-memory access token, single-flight refresh, BroadcastChannel for cross-tab logout, and the logout helper.

**Files:**
- Create: `src/lib/auth.ts`

**Pre-flight:** open `src/gen/api/clients/` and confirm the exact filenames for the refresh and logout operations (recorded in Task 8 Step 3). If they are NOT named `refreshToken.ts` and `logout.ts`, replace the import lines below with the actual filenames (without `.ts`).

- [ ] **Step 1: Create the file**

```ts
import bareApiClient from "@/lib/kubb-clients/bare-api-client"
// NOTE: filenames assumed — verify against Task 8 output. Adjust if different.
import { refreshToken } from "@/gen/api/clients/refreshToken"
import { logout } from "@/gen/api/clients/logout"

let accessToken: string | null = null
let refreshPromise: Promise<boolean> | null = null

const AUTH_CHANNEL = new BroadcastChannel("auth")

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string): void {
  accessToken = token
}

export function clearAuth(): void {
  accessToken = null
}

export async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      const result = await refreshToken({ client: bareApiClient })
      setAccessToken(result.data.accessToken)
      return true
    } catch {
      return false
    }
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export function broadcastLogout(): void {
  AUTH_CHANNEL.postMessage({ type: "logout" })
}

export function onAuthMessage(
  callback: (event: MessageEvent) => void
): () => void {
  AUTH_CHANNEL.addEventListener("message", callback)
  return () => AUTH_CHANNEL.removeEventListener("message", callback)
}

export async function logoutCurrentDevice(): Promise<void> {
  try {
    const token = getAccessToken()
    await logout({
      client: bareApiClient,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    })
  } catch {
    // Network error — still clear local state below
  }

  clearAuth()
  const { useAuthStore } = await import("@/hooks/use-auth")
  useAuthStore.getState().reset()
  broadcastLogout()
  window.location.href = "/auth/login"
}
```

- [ ] **Step 2: Verify the imports resolve**

Run: `pnpm typecheck`
Expected: 0 errors.

If typecheck reports `Cannot find module '@/gen/api/clients/refreshToken'` or similar:
- The actual generated filename is different. Open `src/gen/api/clients/` and find the file. Update the import path in `src/lib/auth.ts`.
- If `result.data.accessToken` errors with "property does not exist on type": the refresh endpoint's response shape differs. Open the generated client file, find its return type, and adjust the destructure (e.g. `result.data.token`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "$(cat <<'EOF'
feat: auth module — in-memory token, single-flight refresh, broadcast

accessToken lives in a module-level let. tryRefreshToken collapses
concurrent calls into one in-flight promise. logoutCurrentDevice posts
to a BroadcastChannel so other tabs can react. clearAuth keeps Zustand
state coupled to in-memory state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: `api-client.ts` and the hooked `kubb-clients/api-client.ts`

The single ky instance with auth + retry hooks, plus the Kubb default-export wrapper that generated clients import by default.

**Files:**
- Create: `src/lib/api-client.ts`, `src/lib/kubb-clients/api-client.ts`

- [ ] **Step 1: Create `src/lib/api-client.ts`**

```ts
import ky, { isNetworkError, isTimeoutError } from "ky"
import { toast } from "sonner"
import { getAccessToken, tryRefreshToken, clearAuth } from "./auth"
import { env } from "./env"

/**
 * Surface a toast only when the failure is something the user can act on —
 * a dead connection or unreachable server. Internal ky control-flow (e.g.
 * the retry triggered by our 401 hook) must not toast.
 */
export function notifyConnectivityIssueIfNeeded(error: unknown): void {
  if (isNetworkError(error) || isTimeoutError(error)) {
    toast.error("Unable to connect. Check your internet and try again.")
  }
}

export const api = ky.create({
  prefix: env.apiUrl,
  credentials: "include",
  hooks: {
    beforeRequest: [
      (state) => {
        const token = getAccessToken()
        if (token) {
          state.request.headers.set("Authorization", `Bearer ${token}`)
        }
      },
    ],
    afterResponse: [
      async (state) => {
        if (state.response.status === 401) {
          const refreshed = await tryRefreshToken()
          if (refreshed) {
            const token = getAccessToken()
            return ky.retry({
              request: new Request(state.request, {
                headers: new Headers({
                  ...Object.fromEntries(state.request.headers),
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                }),
              }),
            })
          }
          clearAuth()
          toast.error("Session expired, please log in again.")
          window.location.href = "/auth/login"
        }
      },
    ],
    beforeError: [
      (state) => {
        notifyConnectivityIssueIfNeeded(state.error)
        return state.error
      },
    ],
  },
})
```

- [ ] **Step 2: Create `src/lib/kubb-clients/api-client.ts`**

```ts
import { api } from "@/lib/api-client"
import { createKubbClient } from "./create-client"

export type {
  RequestConfig,
  ResponseConfig,
  ResponseErrorConfig,
  Client,
} from "./create-client"

const client = createKubbClient(api)

export default client
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api-client.ts src/lib/kubb-clients/api-client.ts
git commit -m "$(cat <<'EOF'
feat: hooked ky api client with 401 retry and connectivity toasts

beforeRequest attaches Authorization from in-memory token; afterResponse
single-flight refreshes and retries on 401, hard-redirects on refresh
failure. Default-export client wraps this ky instance for kubb-generated
code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: `auth-init.ts` (bootstrap on app load)

Refresh once, fetch `/auth/me`, populate Zustand. Idempotent via `isInitialized` guard.

**Files:**
- Create: `src/lib/auth-init.ts`

**Pre-flight:** From Task 8 Step 3, confirm the exact filename of the `GET /auth/me` operation (likely `getCurrentUser.ts`, possibly `getAuthMe.ts` or similar). Use that name in the import.

- [ ] **Step 1: Create the file**

```ts
import { useAuthStore } from "@/hooks/use-auth"
import { tryRefreshToken, getAccessToken } from "@/lib/auth"
import bareApiClient from "@/lib/kubb-clients/bare-api-client"
// NOTE: verify filename against Task 8 output. Adjust if different.
import { getCurrentUser } from "@/gen/api/clients/getCurrentUser"

export async function initializeAuth(): Promise<void> {
  if (useAuthStore.getState().isInitialized) return

  try {
    const refreshed = await tryRefreshToken()
    if (!refreshed) return

    const token = getAccessToken()
    const result = await getCurrentUser({
      client: bareApiClient,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    })
    useAuthStore.getState().setUser(result.data)
  } catch {
    useAuthStore.getState().reset()
  } finally {
    useAuthStore.getState().setInitialized(true)
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: 0 errors.

If typecheck reports the import is missing:
- Open `src/gen/api/clients/` and find the actual `/auth/me` client file. Update the import.

If typecheck reports `Argument of type 'User' is not assignable to parameter of type 'AuthUser'`:
- The generated user shape differs from the placeholder in `use-auth.ts`. Open `src/gen/api/types/` and find the user type (likely `User.ts` or similar). Update `AuthUser` in `src/hooks/use-auth.ts` to either match the generated shape (preferred) or use `import type { User } from "@/gen/api/types/..."` and re-export as `AuthUser`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-init.ts src/hooks/use-auth.ts
git commit -m "$(cat <<'EOF'
feat: auth bootstrap on app load

initializeAuth refreshes the access token from the HttpOnly cookie, then
fetches /auth/me and mirrors the user into Zustand. Idempotent via
isInitialized. Called from __root.tsx beforeLoad in the next task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: New `__root.tsx` and main entry `main.tsx`

Wire the auth bootstrap, cross-tab listener, query client provider, and toaster.

**Files:**
- Create: `src/routes/__root.tsx`, `src/main.tsx`

- [ ] **Step 1: Create `src/routes/__root.tsx`**

```tsx
import * as React from "react"
import {
  createRootRouteWithContext,
  Outlet,
} from "@tanstack/react-router"
import { type QueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { onAuthMessage, clearAuth } from "@/lib/auth"
import { useAuthStore } from "@/hooks/use-auth"
import { initializeAuth } from "@/lib/auth-init"

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: initializeAuth,
  component: RootComponent,
})

function RootComponent() {
  React.useEffect(() => {
    const cleanup = onAuthMessage((msg) => {
      if ((msg.data as { type?: string }).type === "logout") {
        clearAuth()
        useAuthStore.getState().reset()
        toast.error("Session expired, please log in again.")
        window.location.href = "/auth/login"
      }
    })
    return cleanup
  }, [])

  return <Outlet />
}
```

- [ ] **Step 2: Create `src/main.tsx`**

```tsx
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { Toaster } from "sonner"

import "./index.css"
import { queryClient } from "@/lib/query-client"
import { routeTree } from "./routeTree.gen"

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById("root")
if (!rootElement) throw new Error("Root element not found")

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" richColors />
      <RouterProvider router={router} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
)
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: at least one error about missing route files referenced by `routeTree.gen.ts`. **This is expected** — the file is regenerated by the TanStack Router plugin once `vite` runs, and at this point there are no child routes yet. Defer typecheck verification to Task 16.

Alternatively, if `routeTree.gen.ts` already exists with stale references, delete it: `rm -f src/routeTree.gen.ts`. It will be regenerated on the next `pnpm dev` / `pnpm typecheck` after Task 15.

- [ ] **Step 4: Commit**

```bash
git add src/routes/__root.tsx src/main.tsx
git rm -f src/routeTree.gen.ts 2>/dev/null || true
git commit -m "$(cat <<'EOF'
feat: root route with auth bootstrap and SPA entry

__root.tsx runs initializeAuth in beforeLoad and mounts a cross-tab
logout listener. main.tsx wires RouterProvider, QueryClientProvider,
sonner Toaster, and ReactQueryDevtools. routeTree.gen.ts will be
regenerated by the TanStack Router plugin on next dev/build.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Auth layout and unauthenticated route shells

Layout for `/auth/*` plus the two empty login/signup shells.

**Files:**
- Create: `src/routes/auth.tsx`, `src/routes/auth/login.tsx`, `src/routes/auth/signup.tsx`

- [ ] **Step 1: Create `src/routes/auth.tsx`**

```tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/hooks/use-auth"
import { safeRedirectPath } from "@/lib/auth-redirect"

export const Route = createFileRoute("/auth")({
  beforeLoad: ({ search }) => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) return
    const redirectParam =
      typeof (search as { redirect?: unknown }).redirect === "string"
        ? (search as { redirect?: string }).redirect
        : undefined
    const target = safeRedirectPath(redirectParam)
    if (target) throw redirect({ to: target })
    throw redirect({ to: "/" })
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md p-6">
        <Outlet />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/routes/auth/login.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
})

function LoginPage() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Login form — coming in next phase.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/routes/auth/signup.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
})

function SignupPage() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Sign up</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Signup form — coming in next phase.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/routes/auth.tsx src/routes/auth/login.tsx src/routes/auth/signup.tsx
git commit -m "$(cat <<'EOF'
feat: auth layout and login/signup route shells

/auth/* layout redirects authenticated users away (honoring ?redirect=).
Login and signup are placeholder shells — forms come in a later phase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Authenticated layout and feed placeholder

Pathless `_app` layout that guards every authenticated route. Children render at root paths.

**Files:**
- Create: `src/routes/_app.tsx`, `src/routes/_app/index.tsx`

- [ ] **Step 1: Create `src/routes/_app.tsx`**

```tsx
import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
} from "@tanstack/react-router"
import { useAuthStore } from "@/hooks/use-auth"
import { buildLoginRedirectSearch } from "@/lib/auth-redirect"
import { logoutCurrentDevice } from "@/lib/auth"

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({
        to: "/auth/login",
        search: buildLoginRedirectSearch(location.href),
      })
    }
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <nav className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold">
            Social Feed
          </Link>
          <button
            type="button"
            onClick={() => {
              void logoutCurrentDevice()
            }}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Logout
          </button>
        </nav>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/routes/_app/index.tsx`**

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/")({
  component: FeedPlaceholder,
})

function FeedPlaceholder() {
  return (
    <div className="rounded-lg border bg-white p-6">
      <h1 className="text-xl font-semibold">Feed</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Feed coming soon — list rendering and infinite scroll arrive in the
        next phase.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/_app.tsx src/routes/_app/index.tsx
git commit -m "$(cat <<'EOF'
feat: authenticated app layout with feed placeholder

/_app is a pathless layout group that guards every authenticated route
with a beforeLoad redirect to /auth/login (carrying the original path).
Top nav includes a working logout. /_app/index.tsx renders at URL /.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Final verification (typecheck + dev smoke test)

Confirm the whole thing builds, the router generates correct routes, and the auth bootstrap works end-to-end against the live backend.

**Files:** none modified — verification only.

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors. The TanStack Router plugin will (re)generate `src/routeTree.gen.ts` referencing `__root`, `auth`, `auth/login`, `auth/signup`, `_app`, `_app/index`.

If `routeTree.gen.ts` is stale: run `pnpm dev` for ~2 seconds, kill it (Ctrl+C), then re-run typecheck. The plugin regenerates on dev startup.

If typecheck reports errors in `src/gen/api/**`: confirm `tsconfig.json`'s `exclude` array contains `"src/gen/**"`.

- [ ] **Step 2: Start dev server**

Run: `pnpm dev`
Expected: Vite logs `Local: http://localhost:3000/` and "Cloudflare" plugin output. No errors in the terminal.

Keep the backend running at `http://localhost:8787` in another shell during this test.

- [ ] **Step 3: Smoke test — unauthenticated cold load**

In a browser DevTools-open private/incognito window, navigate to `http://localhost:3000/`.

Expected:
- Network panel shows: `POST /api/auth/refresh` → typically 401 or 4xx (no refresh cookie present).
- URL transitions to `http://localhost:3000/auth/login?redirect=/` or `http://localhost:3000/auth/login`.
- Login placeholder shell renders.
- Console: no uncaught errors.

- [ ] **Step 4: Smoke test — authenticated cold load**

(Skip this step if no test user exists yet. Note it in handoff.)

If a refresh cookie can be obtained (e.g., by manually logging in via a backend tool):
- Hard reload `http://localhost:3000/`.
- Network panel: `POST /api/auth/refresh` → 200, then `GET /api/auth/me` → 200.
- Top nav renders, "Feed coming soon" placeholder shows.
- Click Logout. Expected: redirect to `/auth/login`. Backend's logout cookie clear (visible in Application > Cookies).

- [ ] **Step 5: Smoke test — broadcast logout**

(Skip if Step 4 was skipped.)

Open `/` in two tabs (both authenticated). Click Logout in tab A.
Expected: tab B redirects to `/auth/login` shortly after.

- [ ] **Step 6: Document smoke test results**

If everything passed: stop the dev server. Move on to Step 7.

If anything failed: report the failure to the user with the network trace and console error. Do not commit a "fix" without their direction.

- [ ] **Step 7: Final commit (no code changes, just a marker)**

If there were no source changes during verification, skip this step. If `routeTree.gen.ts` changed during verification:

```bash
git add src/routeTree.gen.ts
git commit -m "$(cat <<'EOF'
chore: regenerate route tree

Generated by TanStack Router plugin on first dev run.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

(Whether to commit `routeTree.gen.ts` is a project-level choice. The reference project commits it; this plan defaults to the same.)

---

## Summary of expected commit log after execution

```
chore: regenerate route tree                       (optional, may not happen)
feat: authenticated app layout with feed placeholder
feat: auth layout and login/signup route shells
feat: root route with auth bootstrap and SPA entry
feat: auth bootstrap on app load
feat: hooked ky api client with 401 retry and connectivity toasts
feat: auth module — in-memory token, single-flight refresh, broadcast
feat: bare api client, redirect helper, zustand auth store
chore: generate API client from backend OpenAPI spec
feat: kubb config and fetch-specs script
feat: ky-to-Kubb client adapter
feat: ApiError class and shared QueryClient
feat: zod-validated env module
chore: vite SPA entry with combined /api proxy
chore: add infrastructure dependencies and pnpm scripts
chore: tear down TanStack Start scaffold
docs: add frontend infrastructure setup design     (already on main)
```

16 task commits on top of the spec commit.

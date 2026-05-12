# Auth Pages (Phase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap shadcn/ui + theme tokens and ship `/auth/login` and `/auth/signup` with real API integration, pixel-faithful to `sample_screens/{login,registration}.html`.

**Architecture:** shadcn/ui primitives in `src/components/ui/`; presentational layout pieces in `src/components/auth/`; form logic + mutation hooks in `src/features/auth/`. Forms use TanStack Form + Kubb-generated zod schemas. Post-auth navigation is a hard reload to avoid Zustand-vs-router races.

**Tech Stack:** React 19, TanStack Router, TanStack Form 1.x, TanStack Query, Tailwind v4 (CSS-only theme), shadcn/ui (new-york), zod v4, Kubb, ky, sonner, lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-12-auth-pages-design.md`

**Testing note (deviation from default writing-plans):** Per the approved spec, Phase A is gated by a manual smoke checklist instead of unit tests — the form surface is too thin for unit tests to add signal beyond a typecheck + visual diff. A final verification task runs the checklist before declaring done.

---

## File Map

**Modified:**
- `src/index.css` — append `@theme` block with sample-matched tokens.
- `src/routes/auth.tsx` — swap inner layout to `<AuthLayout>`.
- `src/routes/auth/login.tsx` — real composition.
- `src/routes/auth/signup.tsx` — real composition.
- `package.json` — adds shadcn helpers and Radix peers (via `pnpm dlx shadcn add`).

**Created:**
- `components.json` (shadcn config)
- `src/lib/utils.ts` (`cn` helper)
- `src/components/ui/{button,input,label,checkbox,form}.tsx`
- `src/components/auth/{AuthLayout,AuthShapeBackdrop,AuthHero,AuthCard,AuthDivider,GoogleAuthButton,BottomLink}.tsx`
- `src/features/auth/{extract-error,use-login,use-signup,login-form,signup-form}.ts(x)`
- `public/auth/*` (copied assets), `public/logo.svg`, `public/logo-dark.svg`

---

## Task 1: shadcn init

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Modify: `package.json` (deps added by CLI)

- [ ] **Step 1: Run shadcn init**

```bash
pnpm dlx shadcn@latest init --base-color slate --css-variables --yes
```

Expected: prompts skipped via `--yes`. CLI detects Tailwind v4 and Vite. Creates `components.json`, `src/lib/utils.ts`. Adds `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, `lucide-react` (latter already present, will skip). Updates `src/index.css` with default token block.

If the CLI cannot infer style, re-run with `--style new-york`. If it refuses to write into `src/index.css` because of existing content, run with `--force`.

- [ ] **Step 2: Verify `components.json`**

Read `components.json`. Confirm it contains:
- `"style": "new-york"`
- `"tailwind": { "config": "", "css": "src/index.css", "baseColor": "slate", "cssVariables": true }`
- `"aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }`
- `"iconLibrary": "lucide"`

If any field is off, edit the file to match.

- [ ] **Step 3: Verify `src/lib/utils.ts`**

Expected content:

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

If shadcn wrote it differently, replace with the above.

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. If shadcn added a default `App.tsx` or similar, delete it — we only want the init artifacts.

- [ ] **Step 5: Commit**

```bash
git add components.json src/lib/utils.ts src/index.css package.json pnpm-lock.yaml
git commit -m "chore: shadcn/ui init (new-york, slate, css variables)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Customize theme tokens

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Read current `src/index.css`**

Confirm shadcn appended an `@theme` (or `:root` / `.dark`) block with default slate variables. Note exactly where the original Phase 1 content ends (the `body { margin: 0; ... }` block) so you append after, not before.

- [ ] **Step 2: Replace the shadcn-generated token block with sample-matched values**

Overwrite the `@theme inline { ... }` and `:root { ... }` sections of `src/index.css` so the relevant variables match the sample's `#377DFF` primary + neutral palette. Final file should look like:

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme {
  --font-sans: "Inter Variable", ui-sans-serif, system-ui, sans-serif;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --background: #f5f7fb;
  --foreground: #1a1f36;
  --card: #ffffff;
  --card-foreground: #1a1f36;
  --popover: #ffffff;
  --popover-foreground: #1a1f36;
  --primary: #377dff;
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;
  --secondary-foreground: #1a1f36;
  --muted: #f1f5f9;
  --muted-foreground: #666666;
  --accent: #eef4ff;
  --accent-foreground: #377dff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.08);
  --input: rgba(0, 0, 0, 0.12);
  --ring: #377dff;
  --radius: 0.5rem;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background-color: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Notes:
- If `tw-animate-css` import was inserted elsewhere by shadcn, leave it; the rule is that the file matches the structure above. Order of `@theme` and `@theme inline` does not matter functionally but keep theme variables in `@theme inline` referencing `:root` vars so future dark-mode (Phase B) can override via `.dark { ... }`.
- The `@custom-variant dark` line is the v4 way to define a `dark:` variant tied to a `.dark` ancestor — wire it now so we don't have to revisit in Phase B.

- [ ] **Step 3: Run typecheck and verify dev server**

```bash
pnpm typecheck
```

Expected: 0 errors.

```bash
pnpm dev
```

Open `http://localhost:3000`. Existing `/auth/login` placeholder still renders (no visual change yet beyond background being light grey-blue `#f5f7fb`). Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(theme): shadcn tokens tuned to sample palette (#377DFF)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Install + customize Button primitive

**Files:**
- Create: `src/components/ui/button.tsx` (via shadcn add, then customize)
- Modify: `package.json`

- [ ] **Step 1: Install button primitive**

```bash
pnpm dlx shadcn@latest add button --yes
```

Expected: creates `src/components/ui/button.tsx`. Adds `@radix-ui/react-slot` dep.

- [ ] **Step 2: Customize button.tsx**

Open `src/components/ui/button.tsx`. The generated file uses `cva` for variants. Replace the `buttonVariants` definition with:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        primary:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_8px_24px_-12px_rgba(55,125,255,0.6)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-[14px] px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)
```

Leave the rest of the file (the `Button` component, `forwardRef`, and `buttonVariants` export) as shadcn generated. The new `primary` variant + `lg` size together approximate the sample's `_btn1` look (~48px tall, soft blue shadow, 14px radius).

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/button.tsx package.json pnpm-lock.yaml
git commit -m "feat(ui): button primitive with primary variant matching _btn1

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Install Input, Label, Checkbox

**Files:**
- Create: `src/components/ui/input.tsx`, `label.tsx`, `checkbox.tsx`
- Modify: `package.json`

- [ ] **Step 1: Install primitives**

```bash
pnpm dlx shadcn@latest add input label checkbox --yes
```

Expected: creates the three files. Adds `@radix-ui/react-label`, `@radix-ui/react-checkbox`.

- [ ] **Step 2: Customize `input.tsx`**

In `src/components/ui/input.tsx`, the generated `<input>` has a default `className` string. Replace the `className` argument in `cn(...)` with:

```typescript
"flex h-12 w-full rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
```

(Only change: `h-10` → `h-12`, `px-3` → `px-4`. Matches sample's ~52px field height closer than shadcn's default.)

- [ ] **Step 3: Inspect `checkbox.tsx`**

No customization needed — Radix checkbox with shadcn defaults is fine.

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/checkbox.tsx package.json pnpm-lock.yaml
git commit -m "feat(ui): input, label, checkbox primitives

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Hand-write `ui/form.tsx` for TanStack Form

**Files:**
- Create: `src/components/ui/form.tsx`

- [ ] **Step 1: Write the form primitive**

Create `src/components/ui/form.tsx`:

```typescript
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { AnyFieldApi } from "@tanstack/react-form"

type FormFieldContextValue = {
  fieldId: string
  field: AnyFieldApi
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

function useFormField() {
  const ctx = React.useContext(FormFieldContext)
  if (!ctx) {
    throw new Error("FormItem children must be used inside <FormField>")
  }
  const error = ctx.field.state.meta.errors[0]
  return {
    id: ctx.fieldId,
    name: ctx.field.name,
    formItemId: `${ctx.fieldId}-form-item`,
    formDescriptionId: `${ctx.fieldId}-form-description`,
    formMessageId: `${ctx.fieldId}-form-message`,
    error,
    field: ctx.field,
  }
}

type FormFieldProps = {
  field: AnyFieldApi
  children: React.ReactNode
}

export function FormField({ field, children }: FormFieldProps) {
  const fieldId = React.useId()
  return (
    <FormFieldContext.Provider value={{ fieldId, field }}>
      {children}
    </FormFieldContext.Provider>
  )
}

export const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
FormItem.displayName = "FormItem"

export const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()
  return (
    <Label
      ref={ref}
      htmlFor={formItemId}
      className={cn(error && "text-destructive", className)}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

export const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()
  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId
      }
      aria-invalid={!!error}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()
  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useFormField()
  const messageText = error
    ? typeof error === "string"
      ? error
      : (error as { message?: string }).message ?? String(error)
    : children
  if (!messageText) return null
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {messageText}
    </p>
  )
})
FormMessage.displayName = "FormMessage"
```

Why this shape: TanStack Form's `<form.Field>` already exposes a render-prop with the field API. `<FormField>` here is a thin context wrapper that lets nested `FormLabel` / `FormControl` / `FormMessage` find the field without prop-drilling.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. If `AnyFieldApi` is not exported from `@tanstack/react-form` at the installed version, swap to `FieldApi<any, any, any, any, any>` or import via the generic helper as the type error indicates.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/form.tsx
git commit -m "feat(ui): form primitives ported to tanstack/react-form

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Copy auth assets

**Files:**
- Create: `public/auth/*` (SVGs + PNGs), `public/logo.svg`, `public/logo-dark.svg`

- [ ] **Step 1: Create destination directory**

```bash
mkdir -p public/auth
```

- [ ] **Step 2: Copy assets**

```bash
cp sample_screens/assets/images/shape1.svg public/auth/shape1.svg
cp sample_screens/assets/images/shape2.svg public/auth/shape2.svg
cp sample_screens/assets/images/shape3.svg public/auth/shape3.svg
cp sample_screens/assets/images/dark_shape.svg public/auth/dark_shape.svg
cp sample_screens/assets/images/dark_shape1.svg public/auth/dark_shape1.svg
cp sample_screens/assets/images/dark_shape2.svg public/auth/dark_shape2.svg
cp sample_screens/assets/images/login.png public/auth/login.png
cp sample_screens/assets/images/registration.png public/auth/registration.png
cp sample_screens/assets/images/registration1.png public/auth/registration1.png
cp sample_screens/assets/images/google.svg public/auth/google.svg
cp sample_screens/assets/images/logo.svg public/logo.svg
cp sample_screens/assets/images/logo-copy.svg public/logo-dark.svg
```

If any source file is missing, `ls sample_screens/assets/images/ | grep -i <name>` to find the actual filename and adjust.

- [ ] **Step 3: Verify**

```bash
ls public/auth/ && ls public/logo*.svg
```

Expected: lists the 10 files in `public/auth/` plus `public/logo.svg`, `public/logo-dark.svg`.

- [ ] **Step 4: Commit**

```bash
git add public/auth public/logo.svg public/logo-dark.svg
git commit -m "chore(assets): copy auth illustrations and logos from sample_screens

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Build simple auth layout components

**Files:**
- Create: `src/components/auth/AuthShapeBackdrop.tsx`
- Create: `src/components/auth/AuthDivider.tsx`
- Create: `src/components/auth/GoogleAuthButton.tsx`
- Create: `src/components/auth/BottomLink.tsx`
- Create: `src/components/auth/AuthHero.tsx`

- [ ] **Step 1: Write `AuthShapeBackdrop.tsx`**

```typescript
export function AuthShapeBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <img
        src="/auth/shape1.svg"
        alt=""
        className="absolute -top-10 -left-10 w-48 md:w-64"
      />
      <img
        src="/auth/shape2.svg"
        alt=""
        className="absolute bottom-0 right-0 w-56 md:w-72"
      />
      <img
        src="/auth/shape3.svg"
        alt=""
        className="absolute top-1/3 right-1/4 w-32 md:w-40 opacity-80"
      />
    </div>
  )
}
```

- [ ] **Step 2: Write `AuthDivider.tsx`**

```typescript
export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-4">
      <hr className="flex-1 border-border" />
      <span className="text-sm text-muted-foreground">Or</span>
      <hr className="flex-1 border-border" />
    </div>
  )
}
```

- [ ] **Step 3: Write `GoogleAuthButton.tsx`**

```typescript
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function GoogleAuthButton({ label }: { label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-3"
      onClick={() => toast.info("Google sign-in coming soon")}
    >
      <img src="/auth/google.svg" alt="" className="size-5" />
      <span>{label}</span>
    </Button>
  )
}
```

- [ ] **Step 4: Write `BottomLink.tsx`**

```typescript
import { Link } from "@tanstack/react-router"

type Props = {
  prompt: string
  linkText: string
  to: "/auth/login" | "/auth/signup"
}

export function BottomLink({ prompt, linkText, to }: Props) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {prompt}{" "}
      <Link to={to} className="font-medium text-primary hover:underline">
        {linkText}
      </Link>
    </p>
  )
}
```

- [ ] **Step 5: Write `AuthHero.tsx`**

```typescript
type Props = {
  imageSrc: string
  imageAlt: string
}

export function AuthHero({ imageSrc, imageAlt }: Props) {
  return (
    <div className="hidden lg:col-span-8 lg:flex items-center justify-center px-12">
      <img src={imageSrc} alt={imageAlt} className="max-h-[80vh] w-auto" />
    </div>
  )
}
```

- [ ] **Step 6: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/
git commit -m "feat(auth-ui): backdrop, divider, google button, bottom link, hero

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Build `AuthCard` and `AuthLayout`

**Files:**
- Create: `src/components/auth/AuthCard.tsx`
- Create: `src/components/auth/AuthLayout.tsx`

- [ ] **Step 1: Write `AuthCard.tsx`**

```typescript
import type { ReactNode } from "react"
import { AuthDivider } from "./AuthDivider"
import { GoogleAuthButton } from "./GoogleAuthButton"

type Props = {
  eyebrow: string
  title: string
  googleLabel: string
  children: ReactNode
  footer: ReactNode
}

export function AuthCard({ eyebrow, title, googleLabel, children, footer }: Props) {
  return (
    <div className="col-span-1 lg:col-span-4 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <img src="/logo.svg" alt="Buddy Script" className="mb-8 h-10 w-auto" />
        <p className="mb-2 text-sm text-muted-foreground">{eyebrow}</p>
        <h1 className="mb-10 text-2xl font-semibold text-foreground">{title}</h1>
        <GoogleAuthButton label={googleLabel} />
        <AuthDivider />
        {children}
        <div className="mt-10">{footer}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `AuthLayout.tsx`**

```typescript
import type { ReactNode } from "react"
import { AuthShapeBackdrop } from "./AuthShapeBackdrop"

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full">
      <AuthShapeBackdrop />
      <div className="relative z-0 mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-12">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/AuthCard.tsx src/components/auth/AuthLayout.tsx
git commit -m "feat(auth-ui): AuthCard and AuthLayout (8/4 split with backdrop)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Error helper

**Files:**
- Create: `src/features/auth/extract-error.ts`

- [ ] **Step 1: Write the helper**

```typescript
import { ApiError } from "@/lib/api-error"

export type ExtractedError = {
  status: number | null
  message: string
}

const FALLBACK = "Something went wrong. Please try again."

export function extractApiError(err: unknown): ExtractedError {
  if (err instanceof ApiError) {
    const body = err.body as { message?: string; error?: string } | null
    const message = body?.message ?? body?.error ?? err.message ?? FALLBACK
    return { status: err.status, message }
  }
  if (err instanceof Error && err.message) {
    return { status: null, message: err.message }
  }
  return { status: null, message: FALLBACK }
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/extract-error.ts
git commit -m "feat(auth): extractApiError normalizes ApiError into {status, message}

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `useLoginMutation` wrapper

**Files:**
- Create: `src/features/auth/use-login.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useLogin } from "@/gen/api/hooks/useLogin"
import { setAccessToken } from "@/lib/auth"
import { useAuthStore } from "@/hooks/use-auth"
import { safeRedirectPath } from "@/lib/auth-redirect"

export function useLoginMutation(redirectParam?: string) {
  return useLogin({
    mutation: {
      onSuccess: (response) => {
        const { accessToken, user } = response.data
        setAccessToken(accessToken)
        useAuthStore.getState().setUser(user)
        const target = safeRedirectPath(redirectParam) ?? "/"
        window.location.href = target
      },
    },
  })
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. If the generated `useLogin` import path uses a `.ts` extension (Kubb writes them), update to `"@/gen/api/hooks/useLogin.ts"` — confirmed correct extension is already used by other call sites in `src/lib/auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/use-login.ts
git commit -m "feat(auth): useLoginMutation persists session and hard-redirects

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: `useSignupMutation` wrapper

**Files:**
- Create: `src/features/auth/use-signup.ts`

- [ ] **Step 1: Write the hook**

```typescript
import { useSignup } from "@/gen/api/hooks/useSignup"
import { setAccessToken } from "@/lib/auth"
import { useAuthStore } from "@/hooks/use-auth"

export function useSignupMutation() {
  return useSignup({
    mutation: {
      onSuccess: (response) => {
        const { accessToken, user } = response.data
        setAccessToken(accessToken)
        useAuthStore.getState().setUser(user)
        window.location.href = "/"
      },
    },
  })
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/use-signup.ts
git commit -m "feat(auth): useSignupMutation auto-signs-in on success

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Login form

**Files:**
- Create: `src/features/auth/login-form.tsx`

- [ ] **Step 1: Write the form**

```typescript
import { useState } from "react"
import { useForm } from "@tanstack/react-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { loginBodySchema } from "@/gen/api/zod/loginBodySchema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { useLoginMutation } from "./use-login"
import { extractApiError } from "./extract-error"

type Props = {
  redirectParam?: string
}

export function LoginForm({ redirectParam }: Props) {
  const mutation = useLoginMutation(redirectParam)
  const [topError, setTopError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { email: "", password: "", rememberMe: true },
    validators: {
      onSubmit: ({ value }) => {
        const result = loginBodySchema.safeParse({
          email: value.email,
          password: value.password,
        })
        if (!result.success) {
          const fieldErrors: Record<string, string> = {}
          for (const issue of result.error.issues) {
            const key = issue.path[0]
            if (typeof key === "string" && !(key in fieldErrors)) {
              fieldErrors[key] = issue.message
            }
          }
          return { fields: fieldErrors }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      setTopError(null)
      try {
        await mutation.mutateAsync({
          data: { email: value.email, password: value.password },
        })
      } catch (err) {
        const { status, message } = extractApiError(err)
        if (status === 401) {
          setTopError("Invalid email or password")
          toast.error(message)
          form.setFieldValue("password", "")
        } else {
          toast.error(message)
        }
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (mutation.isPending) return
        void form.handleSubmit()
      }}
      className="space-y-4"
    >
      {topError ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {topError}
        </div>
      ) : null}

      <form.Field name="email">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <div className="flex items-center justify-between">
        <form.Field name="rememberMe">
          {(field) => (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={field.state.value}
                onCheckedChange={(v) =>
                  field.handleChange(v === "indeterminate" ? false : v)
                }
              />
              Remember me
            </label>
          )}
        </form.Field>
        <button
          type="button"
          onClick={() => toast.info("Password reset coming soon")}
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot password?
        </button>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Login now"
        )}
      </Button>
    </form>
  )
}
```

Why this shape:
- Validation runs on submit (not blur) — gives the user a quiet typing experience and only complains when they ask for action. Blur-time validation can be added later if QA wants it.
- `mutation.mutateAsync` lets the form's `onSubmit` `await` and catch — we control error display centrally.
- The 401 branch sets a top-form banner *and* clears the password (security hygiene + UX).
- `rememberMe` is captured but not sent to the backend (no API field for it); harmless decoration.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. If TanStack Form's `useForm` complains about the `validators.onSubmit` return shape, the v1 contract is `{ fields?: Record<string, string>, form?: string } | undefined`. The code above matches that contract.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/login-form.tsx
git commit -m "feat(auth): LoginForm with zod validation and 401 inline banner

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Signup form

**Files:**
- Create: `src/features/auth/signup-form.tsx`

- [ ] **Step 1: Write the form**

```typescript
import { useForm } from "@tanstack/react-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod/v4"
import { signupBodySchema } from "@/gen/api/zod/signupBodySchema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { useSignupMutation } from "./use-signup"
import { extractApiError } from "./extract-error"

const fullSchema = signupBodySchema
  .extend({
    confirmPassword: z.string(),
    agreeToTerms: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.agreeToTerms === true, {
    message: "You must agree to the terms",
    path: ["agreeToTerms"],
  })

export function SignupForm() {
  const mutation = useSignupMutation()

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false as boolean,
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = fullSchema.safeParse(value)
        if (!result.success) {
          const fieldErrors: Record<string, string> = {}
          for (const issue of result.error.issues) {
            const key = issue.path[0]
            if (typeof key === "string" && !(key in fieldErrors)) {
              fieldErrors[key] = issue.message
            }
          }
          return { fields: fieldErrors }
        }
        return undefined
      },
    },
    onSubmit: async ({ value }) => {
      try {
        await mutation.mutateAsync({
          data: {
            firstName: value.firstName,
            lastName: value.lastName,
            email: value.email,
            password: value.password,
          },
        })
      } catch (err) {
        const { status, message } = extractApiError(err)
        if (status === 409) {
          form.setFieldMeta("email", (m) => ({
            ...m,
            errors: ["Email already in use"],
          }))
          toast.error(message)
        } else {
          toast.error(message)
        }
      }
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (mutation.isPending) return
        void form.handleSubmit()
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <form.Field name="firstName">
          {(field) => (
            <FormField field={field}>
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="given-name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          )}
        </form.Field>
        <form.Field name="lastName">
          {(field) => (
            <FormField field={field}>
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="family-name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          )}
        </form.Field>
      </div>

      <form.Field name="email">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <form.Field name="confirmPassword">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Repeat password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <form.Field name="agreeToTerms">
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(v) =>
                    field.handleChange(v === "indeterminate" ? false : v)
                  }
                />
                I agree to terms &amp; conditions
              </label>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Sign up now"
        )}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. If `setFieldMeta` API differs in the installed v1, the alternative is `form.fieldInfo.email.instance?.setMeta(...)` or `field.setMeta(...)` from within a field render-prop. Verify against `node_modules/@tanstack/react-form/dist/...` if needed.

- [ ] **Step 3: Commit**

```bash
git add src/features/auth/signup-form.tsx
git commit -m "feat(auth): SignupForm with confirm-password and 409 inline error

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Wire routes

**Files:**
- Modify: `src/routes/auth.tsx`
- Modify: `src/routes/auth/login.tsx`
- Modify: `src/routes/auth/signup.tsx`

- [ ] **Step 1: Update `src/routes/auth.tsx`**

Replace the existing `AuthLayout` component (the centered-card div) with the new layout import. Final file:

```typescript
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/hooks/use-auth"
import { safeRedirectPath } from "@/lib/auth-redirect"
import { AuthLayout } from "@/components/auth/AuthLayout"

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
  component: AuthLayoutRoute,
})

function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Update `src/routes/auth/login.tsx`**

```typescript
import { createFileRoute } from "@tanstack/react-router"
import { AuthHero } from "@/components/auth/AuthHero"
import { AuthCard } from "@/components/auth/AuthCard"
import { BottomLink } from "@/components/auth/BottomLink"
import { LoginForm } from "@/features/auth/login-form"

type LoginSearch = { redirect?: string }

export const Route = createFileRoute("/auth/login")({
  validateSearch: (search): LoginSearch => ({
    redirect:
      typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { redirect: redirectParam } = Route.useSearch()
  return (
    <>
      <AuthHero imageSrc="/auth/login.png" imageAlt="Sign in illustration" />
      <AuthCard
        eyebrow="Welcome back"
        title="Login to your account"
        googleLabel="Or sign-in with google"
        footer={
          <BottomLink
            prompt="Don't have an account?"
            linkText="Create New Account"
            to="/auth/signup"
          />
        }
      >
        <LoginForm redirectParam={redirectParam} />
      </AuthCard>
    </>
  )
}
```

- [ ] **Step 3: Update `src/routes/auth/signup.tsx`**

```typescript
import { createFileRoute } from "@tanstack/react-router"
import { AuthHero } from "@/components/auth/AuthHero"
import { AuthCard } from "@/components/auth/AuthCard"
import { BottomLink } from "@/components/auth/BottomLink"
import { SignupForm } from "@/features/auth/signup-form"

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
})

function SignupPage() {
  return (
    <>
      <AuthHero
        imageSrc="/auth/registration.png"
        imageAlt="Registration illustration"
      />
      <AuthCard
        eyebrow="Get Started Now"
        title="Registration"
        googleLabel="Register with google"
        footer={
          <BottomLink
            prompt="Already have an account?"
            linkText="Sign in"
            to="/auth/login"
          />
        }
      >
        <SignupForm />
      </AuthCard>
    </>
  )
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm typecheck
```

Expected: 0 errors. The TanStack Router code generator runs as part of vite; if route metadata is stale, `pnpm dev` will rewrite `src/routeTree.gen.ts`. If typecheck fails on routeTree, start `pnpm dev` once to regenerate, kill it, re-run typecheck.

- [ ] **Step 5: Run lint**

```bash
pnpm lint
```

Expected: 0 errors. Fix any prettier/eslint issues inline.

- [ ] **Step 6: Commit**

```bash
git add src/routes/auth.tsx src/routes/auth/login.tsx src/routes/auth/signup.tsx src/routeTree.gen.ts
git commit -m "feat(routes): wire AuthLayout and real login/signup compositions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Final smoke verification

**Files:** none (runtime checks only).

**Pre-req:** the backend must be running at `http://localhost:8787` for any API-touching check. If it isn't, the proxy will return network errors and those checks should be marked as "deferred — backend not running" rather than failed.

- [ ] **Step 1: Typecheck and lint clean**

```bash
pnpm typecheck && pnpm lint
```

Expected: both 0 errors.

- [ ] **Step 2: Start dev server**

```bash
pnpm dev
```

Expected: server listens on `http://localhost:3000`. No console warnings about missing imports or unresolved aliases.

- [ ] **Step 3: Visual parity — login**

Open `http://localhost:3000/auth/login` at 1440px wide. Open `sample_screens/login.html` in a second tab at the same width. Compare side-by-side:
- Split layout (hero left ~2/3, form right ~1/3).
- Shape SVGs in the same approximate corners.
- Logo at top of form, eyebrow ("Welcome back"), title ("Login to your account"), then Google button, "Or" divider, email field, password field, Remember + Forgot row, blue Login button, bottom link.
- Field heights and button height visually match the sample's chunky inputs/buttons.

If anything is materially off, adjust Tailwind classes on the corresponding component file and refresh. Common tweaks: spacing under headings (use `mb-8` / `mb-10` swaps), shape positions in `AuthShapeBackdrop`, hero image size.

- [ ] **Step 4: Visual parity — signup**

Repeat at `http://localhost:3000/auth/signup` vs. `sample_screens/registration.html`. The form has more fields now (firstName/lastName/email/password/confirm/terms). The two-column firstName/lastName row should sit neatly above email; everything else mirrors the sample.

- [ ] **Step 5: Responsive check**

Shrink the browser to <1024px. Hero hides; form centers. Shapes remain visible behind. Repeat for signup.

- [ ] **Step 6: Login form behavior**

Without typing anything, click Login now. Expected: inline zod errors below email and password. No toast.

Type `not-an-email` in email, blank password, click Login. Expected: inline "Invalid email" + "Password must be at least 1 characters" (or similar — zod v4 default messages).

Type a valid-looking email and a 1-character password against the backend. Expected: API rejects with 401 → inline banner "Invalid email or password" above the form, toast with backend message, password input cleared, email retained.

Visit `http://localhost:3000/auth/login?redirect=/foo`. Submit with valid creds (use a known test account). Expected: spinner in button, hard reload, lands at `/foo` if `/foo` route exists, otherwise the router's not-found behavior.

Visit `http://localhost:3000/auth/login?redirect=//evil.com`. Submit with valid creds. Expected: lands at `/` (open-redirect blocked by `safeRedirectPath`).

Click "Forgot password?". Expected: toast "Password reset coming soon". No navigation.

Click the Google button. Expected: toast "Google sign-in coming soon". No submit.

- [ ] **Step 7: Signup form behavior**

Submit empty. Expected: inline errors on all required fields including the terms checkbox.

Type a password and a different confirm. Expected: inline "Passwords do not match" under confirm.

Fill all valid fields with a *new* email + checked terms. Submit. Expected: hard reload to `/`.

Repeat with the same email. Expected: 409 → inline "Email already in use" under email + toast.

- [ ] **Step 8: Existing flows untouched**

Once signed in (after Step 7), click Logout from the top nav (the `_app` layout still renders its placeholder header with a Logout button). Expected: redirect to `/auth/login`.

- [ ] **Step 9: Stop dev server, final commit (if any visual tweaks were made in Steps 3–7)**

```bash
git status
```

If files changed during visual iteration:

```bash
git add -p   # review each hunk
git commit -m "fix(auth-ui): visual tweaks from smoke pass

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

If nothing changed, skip the commit. Phase A is complete.

---

## Spec coverage check

| Spec section | Covered by |
|---|---|
| Foundation: `components.json`, `cn`, theme tokens | Tasks 1, 2 |
| UI primitives: button, input, label, checkbox, form | Tasks 3, 4, 5 |
| `AuthLayout`, `AuthShapeBackdrop` | Tasks 7, 8 |
| `AuthHero`, `AuthCard`, `AuthDivider`, `GoogleAuthButton`, `BottomLink` | Tasks 7, 8 |
| `extract-error` | Task 9 |
| `useLoginMutation`, `useSignupMutation` | Tasks 10, 11 |
| `LoginForm`, `SignupForm` | Tasks 12, 13 |
| Route bodies updated | Task 14 |
| Manual smoke gate | Task 15 |
| Asset copy | Task 6 |

## Risks called out in spec, with mitigation per task

- **TanStack Form recipe port** — Task 5 hand-writes it; Task 5 Step 2 calls out the `AnyFieldApi` import fallback.
- **Generated zod schema names** — verified pre-plan; confirmed `loginBodySchema` and `signupBodySchema` exist at `src/gen/api/zod/`. No verification task needed.
- **Poppins vs. Inter font** — left as a visible swap in Task 2's CSS if visual review demands it.
- **`_btn1` exact dimensions** — Task 3 sets `lg` size to `h-12 rounded-[14px]`; Task 15 Step 3 iterates if it's off.
- **Sample registration form missing names** — Task 13 includes them.
- **Sample BottomLink bug on registration** — Task 14 Step 3 sets correct "Already have an account?" copy.

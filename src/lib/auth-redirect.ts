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

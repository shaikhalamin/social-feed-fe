import bareApiClient from "@/lib/kubb-clients/bare-api-client"
import { refresh } from "@/gen/api/clients/refresh.ts"
import { logout } from "@/gen/api/clients/logout.ts"

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
      const result = await refresh({ client: bareApiClient })
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

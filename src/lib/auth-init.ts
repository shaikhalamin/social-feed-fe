import { useAuthStore } from "@/hooks/use-auth"
import { tryRefreshToken, getAccessToken } from "@/lib/auth"
import bareApiClient from "@/lib/kubb-clients/bare-api-client"
import { getCurrentUser } from "@/gen/api/clients/getCurrentUser.ts"

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

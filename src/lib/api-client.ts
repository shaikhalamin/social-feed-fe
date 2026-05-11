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

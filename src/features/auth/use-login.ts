import { useLogin } from "@/gen/api/hooks/useLogin.ts"
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

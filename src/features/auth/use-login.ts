import { useRouter } from "@tanstack/react-router"
import { useLogin } from "@/gen/api/hooks/useLogin.ts"
import { setAccessToken } from "@/lib/auth"
import { useAuthStore } from "@/hooks/use-auth"
import { safeRedirectPath } from "@/lib/auth-redirect"
import { queryClient } from "@/lib/query-client"

export function useLoginMutation(redirectParam?: string) {
  const router = useRouter()
  return useLogin({
    mutation: {
      onSuccess: async (response) => {
        const { accessToken, user } = response.data
        setAccessToken(accessToken)
        useAuthStore.getState().setUser(user)
        queryClient.clear()
        const target = safeRedirectPath(redirectParam) ?? "/"
        await router.navigate({ href: target })
      },
    },
  })
}

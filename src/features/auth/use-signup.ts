import { useSignup } from "@/gen/api/hooks/useSignup.ts"
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

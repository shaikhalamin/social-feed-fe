import { useNavigate } from "@tanstack/react-router"
import { toast } from "@/components/ui/sonner"
import { useSignup } from "@/gen/api/hooks/useSignup.ts"
import { setAccessToken } from "@/lib/auth"
import { useAuthStore } from "@/hooks/use-auth"
import { queryClient } from "@/lib/query-client"

export function useSignupMutation() {
  const navigate = useNavigate()
  return useSignup({
    mutation: {
      onSuccess: async (response) => {
        const { accessToken, user } = response.data
        setAccessToken(accessToken)
        useAuthStore.getState().setUser(user)
        queryClient.clear()
        toast.success(`Welcome, ${user.firstName}!`)
        await navigate({ to: "/" })
      },
    },
  })
}

import { useNavigate } from "@tanstack/react-router"
import { toast } from "@/components/ui/sonner"
import { useSignup } from "@/gen/api/hooks/useSignup.ts"
import { logout } from "@/gen/api/clients/logout.ts"
import bareApiClient from "@/lib/kubb-clients/bare-api-client"

export function useSignupMutation() {
  const navigate = useNavigate()
  return useSignup({
    mutation: {
      onSuccess: async (response) => {
        const { accessToken } = response.data
        try {
          await logout({
            client: bareApiClient,
            headers: { Authorization: `Bearer ${accessToken}` },
          })
        } catch {
          // best-effort: clear server-side refresh cookie so user is not auto-logged-in
        }
        toast.success("Account created. Please sign in.")
        await navigate({ to: "/auth/login" })
      },
    },
  })
}

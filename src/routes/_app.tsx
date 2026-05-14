import { createFileRoute, redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/hooks/use-auth"
import { initializeAuth } from "@/lib/auth-init"
import { buildLoginRedirectSearch } from "@/lib/auth-redirect"
import { AppLayout } from "@/components/shell/AppLayout"

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ location }) => {
    await initializeAuth()
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) {
      throw redirect({
        to: "/auth/login",
        search: buildLoginRedirectSearch(location.href),
      })
    }
  },
  component: AppLayout,
})

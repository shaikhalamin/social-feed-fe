import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/hooks/use-auth"
import { safeRedirectPath } from "@/lib/auth-redirect"
import { AuthLayout } from "@/components/auth/AuthLayout"

export const Route = createFileRoute("/auth")({
  beforeLoad: ({ search }) => {
    const { isAuthenticated } = useAuthStore.getState()
    if (!isAuthenticated) return
    const redirectParam =
      typeof (search as { redirect?: unknown }).redirect === "string"
        ? (search as { redirect?: string }).redirect
        : undefined
    const target = safeRedirectPath(redirectParam)
    if (target) throw redirect({ to: target })
    throw redirect({ to: "/" })
  },
  component: AuthLayoutRoute,
})

function AuthLayoutRoute() {
  return (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  )
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useAuthStore } from "@/hooks/use-auth"
import { safeRedirectPath } from "@/lib/auth-redirect"

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
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="w-full max-w-md p-6">
        <Outlet />
      </div>
    </div>
  )
}

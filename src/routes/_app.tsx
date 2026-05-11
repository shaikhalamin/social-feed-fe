import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
} from "@tanstack/react-router"
import { useAuthStore } from "@/hooks/use-auth"
import { buildLoginRedirectSearch } from "@/lib/auth-redirect"
import { logoutCurrentDevice } from "@/lib/auth"

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ location }) => {
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

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white">
        <nav className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold">
            Social Feed
          </Link>
          <button
            type="button"
            onClick={() => {
              void logoutCurrentDevice()
            }}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Logout
          </button>
        </nav>
      </header>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

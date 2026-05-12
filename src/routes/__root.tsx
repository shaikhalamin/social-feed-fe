import * as React from "react"
import {
  createRootRouteWithContext,
  Outlet,
  useNavigate,
} from "@tanstack/react-router"
import type {QueryClient} from "@tanstack/react-query";
import { toast } from "@/components/ui/sonner"
import { onAuthMessage, clearAuth } from "@/lib/auth"
import { useAuthStore } from "@/hooks/use-auth"
import { initializeAuth } from "@/lib/auth-init"
import { queryClient } from "@/lib/query-client"

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: initializeAuth,
  component: RootComponent,
})

function RootComponent() {
  const navigate = useNavigate()
  React.useEffect(() => {
    const cleanup = onAuthMessage((msg) => {
      if ((msg.data as { type?: string }).type === "logout") {
        clearAuth()
        useAuthStore.getState().reset()
        queryClient.clear()
        toast.error("Session expired, please log in again.")
        void navigate({ to: "/auth/login" })
      }
    })
    return cleanup
  }, [navigate])

  return <Outlet />
}

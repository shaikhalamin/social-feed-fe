import * as React from "react"
import {
  createRootRouteWithContext,
  Outlet,
} from "@tanstack/react-router"
import type {QueryClient} from "@tanstack/react-query";
import { toast } from "sonner"
import { onAuthMessage, clearAuth } from "@/lib/auth"
import { useAuthStore } from "@/hooks/use-auth"
import { initializeAuth } from "@/lib/auth-init"

type RouterContext = {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: initializeAuth,
  component: RootComponent,
})

function RootComponent() {
  React.useEffect(() => {
    const cleanup = onAuthMessage((msg) => {
      if ((msg.data as { type?: string }).type === "logout") {
        clearAuth()
        useAuthStore.getState().reset()
        toast.error("Session expired, please log in again.")
        window.location.href = "/auth/login"
      }
    })
    return cleanup
  }, [])

  return <Outlet />
}

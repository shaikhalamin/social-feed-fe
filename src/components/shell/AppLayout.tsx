import { Outlet } from "@tanstack/react-router"
import { AppHeader } from "@/components/shell/AppHeader"
import { FloatingThemeToggle } from "@/components/shell/FloatingThemeToggle"
import { LeftSidebar } from "@/components/shell/LeftSidebar"
import { RightSidebar } from "@/components/shell/RightSidebar"

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <FloatingThemeToggle />
      <AppHeader />
      <div className="mx-auto max-w-[1320px] px-4 pt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <LeftSidebar />
          </aside>
          <main className="col-span-1 lg:col-span-6">
            <Outlet />
          </main>
          <aside className="hidden lg:col-span-3 lg:block">
            <RightSidebar />
          </aside>
        </div>
      </div>
    </div>
  )
}

import { Link } from "@tanstack/react-router"
import { AvatarMenu } from "@/components/shell/AvatarMenu"
import { HeaderNavLinks } from "@/components/shell/HeaderNavLinks"
import { NotificationsBell } from "@/components/shell/NotificationsBell"
import { SearchBar } from "@/components/shell/SearchBar"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-6 px-4">
        <Link to="/" aria-label="Home" className="flex items-center gap-2">
          <img src="/logo.svg" alt="Social Feed" className="h-7" />
        </Link>
        <SearchBar />
        <div className="ml-auto flex items-center gap-2">
          <HeaderNavLinks />
          <NotificationsBell />
          <AvatarMenu />
        </div>
      </div>
    </header>
  )
}

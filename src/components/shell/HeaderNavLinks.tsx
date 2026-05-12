import { Link, useMatchRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import {
  FriendsIcon,
  HomeIcon,
  MessageIcon,
} from "@/components/shell/icons"

export function HeaderNavLinks() {
  const matchRoute = useMatchRoute()
  const homeActive = Boolean(matchRoute({ to: "/", fuzzy: false }))
  const friendsActive = Boolean(matchRoute({ to: "/friend-requests" }))

  const base =
    "inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-accent"
  const activeCls = "bg-accent text-accent-foreground"

  return (
    <nav className="flex items-center gap-1">
      <Link
        to="/"
        aria-label="Home"
        className={`${base} ${homeActive ? activeCls : ""}`}
      >
        <HomeIcon active={homeActive} />
      </Link>
      <Link
        to="/friend-requests"
        aria-label="Friend requests"
        className={`${base} ${friendsActive ? activeCls : ""}`}
      >
        <FriendsIcon active={friendsActive} />
      </Link>
      <button
        type="button"
        aria-label="Messages"
        onClick={() => toast.info("Messages coming soon")}
        className={base}
      >
        <MessageIcon />
      </button>
    </nav>
  )
}

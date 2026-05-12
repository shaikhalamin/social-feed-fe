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
  // TODO(Task 13): remove cast after route exists
  const friendsActive = Boolean(matchRoute({ to: "/friend-requests" as any }))

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
        // TODO(Task 13): remove cast after route exists
        to={"/friend-requests" as any}
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

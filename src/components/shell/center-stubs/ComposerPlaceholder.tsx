import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuthStore } from "@/hooks/use-auth"

function userInitials(name: string | null | undefined): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

export function ComposerPlaceholder() {
  const user = useAuthStore((s) => s.user)
  const handle = () => toast.info("Composer arrives in Phase C")
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
    : null

  return (
    <div className="rounded-lg bg-card p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          <AvatarImage src={user?.avatarUrl ?? undefined} alt={fullName ?? ""} />
          <AvatarFallback>{userInitials(fullName)}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={handle}
          className="flex-1 rounded-full bg-muted px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted/80"
        >
          What's on your mind?
        </button>
        <button
          type="button"
          onClick={handle}
          aria-label="Add image"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
          >
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <circle cx="9" cy="10" r="1.5" stroke="currentColor" />
            <path
              d="M21 17l-5-5-9 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

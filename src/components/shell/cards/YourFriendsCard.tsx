import { useState  } from "react"
import type {FormEvent} from "react";
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SearchIcon } from "@/components/shell/icons"
import { SAMPLE_FRIENDS } from "@/data/sample-shell"

export function YourFriendsCard() {
  const [query, setQuery] = useState("")
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    toast.info("Search coming soon")
  }
  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-semibold">Your Friends</h4>
        <button
          type="button"
          onClick={() => toast.info("See all coming soon")}
          className="text-xs font-medium text-primary hover:underline"
        >
          See All
        </button>
      </header>
      <form onSubmit={handleSubmit} className="relative mb-3">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <SearchIcon />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search friends"
          aria-label="Search friends"
          className="h-9 w-full rounded-full bg-muted pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </form>
      <ScrollArea className="max-h-[420px] pr-2">
        <ul className="space-y-3">
          {SAMPLE_FRIENDS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => toast.info("Open chat coming soon")}
                className="flex w-full items-center gap-3 rounded-md p-1.5 text-left hover:bg-muted"
              >
                <Avatar className="size-9">
                  <AvatarImage src={f.avatar} alt={f.name} />
                  <AvatarFallback>{f.name[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.title}
                  </p>
                </div>
                {f.status === "online" ? (
                  <span
                    aria-label="Online"
                    className="inline-block size-2 rounded-full bg-emerald-500"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {f.lastSeen ?? ""}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
    </section>
  )
}

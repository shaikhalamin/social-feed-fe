import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SAMPLE_SUGGESTED_PEOPLE } from "@/data/sample-shell"

export function SuggestedPeopleCard() {
  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-semibold">Suggested People</h4>
        <button
          type="button"
          onClick={() => toast.info("See all coming soon")}
          className="text-xs font-medium text-primary hover:underline"
        >
          See All
        </button>
      </header>
      <ul className="space-y-4">
        {SAMPLE_SUGGESTED_PEOPLE.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={p.avatar} alt={p.name} />
              <AvatarFallback>{p.name[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.title}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toast.info("Friend request coming soon")}
              className="text-sm font-medium text-primary hover:underline"
            >
              Connect
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

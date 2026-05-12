import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { SAMPLE_EVENTS } from "@/data/sample-shell"

export function EventsCard() {
  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-semibold">Events</h4>
        <button
          type="button"
          onClick={() => toast.info("See all coming soon")}
          className="text-xs font-medium text-primary hover:underline"
        >
          See all
        </button>
      </header>
      <ul className="space-y-5">
        {SAMPLE_EVENTS.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => toast.info("Open event coming soon")}
              className="block w-full text-left"
            >
              <img
                src={ev.image}
                alt={ev.title}
                className="h-32 w-full rounded-md object-cover"
              />
              <div className="mt-3 flex items-start gap-3">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-muted px-2 py-1 text-center">
                  <span className="text-lg font-semibold leading-tight text-primary">
                    {ev.day}
                  </span>
                  <span className="text-xs uppercase text-muted-foreground">
                    {ev.month}
                  </span>
                </div>
                <p className="text-sm font-medium leading-snug">{ev.title}</p>
              </div>
            </button>
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {ev.attendeesText}
              </span>
              <button
                type="button"
                onClick={() => toast.info("RSVP coming soon")}
                className="text-sm font-medium text-primary hover:underline"
              >
                Going
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

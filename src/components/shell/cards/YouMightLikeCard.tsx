import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { SAMPLE_YOU_MIGHT_LIKE } from "@/data/sample-shell"

export function YouMightLikeCard() {
  const person = SAMPLE_YOU_MIGHT_LIKE[0]
  if (!person) return null

  return (
    <section className="rounded-lg bg-card p-6 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h4 className="text-base font-semibold">You Might Like</h4>
        <button
          type="button"
          onClick={() => toast.info("See all coming soon")}
          className="text-xs font-medium text-primary hover:underline"
        >
          See All
        </button>
      </header>
      <div className="flex flex-col items-center text-center">
        <Avatar className="size-16">
          <AvatarImage src={person.avatar} alt={person.name} />
          <AvatarFallback>{person.name[0]}</AvatarFallback>
        </Avatar>
        <p className="mt-3 text-sm font-semibold">{person.name}</p>
        <p className="text-xs text-muted-foreground">{person.title}</p>
        <div className="mt-4 flex w-full gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => toast.info("Ignore coming soon")}
          >
            Ignore
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => toast.info("Friend request coming soon")}
          >
            Follow
          </Button>
        </div>
      </div>
    </section>
  )
}

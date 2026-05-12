import { toast } from "sonner"
import { ArrowRightIcon, PlusIcon } from "@/components/shell/icons"
import { SAMPLE_STORIES } from "@/data/sample-shell"

export function StoriesCarousel() {
  return (
    <div className="relative">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {SAMPLE_STORIES.map((story) => (
          <button
            key={story.id}
            type="button"
            onClick={() =>
              toast.info(
                story.isOwn
                  ? "Adding a story coming soon"
                  : "Opening story coming soon",
              )
            }
            className="relative flex h-[140px] w-[110px] shrink-0 overflow-hidden rounded-lg bg-card shadow-sm"
          >
            <img
              src={story.avatar}
              alt={story.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-left">
              <p className="text-xs font-medium text-white">{story.name}</p>
            </div>
            {story.isOwn ? (
              <span className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <PlusIcon />
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => toast.info("Carousel scroll coming soon")}
        aria-label="Scroll stories"
        className="absolute right-0 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full bg-card text-foreground shadow"
      >
        <ArrowRightIcon />
      </button>
    </div>
  )
}

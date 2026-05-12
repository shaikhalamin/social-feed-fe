import { createFileRoute } from "@tanstack/react-router"
import { ComposerPlaceholder } from "@/components/shell/center-stubs/ComposerPlaceholder"
import { FeedPlaceholder } from "@/components/shell/center-stubs/FeedPlaceholder"
import { StoriesCarousel } from "@/components/shell/center-stubs/StoriesCarousel"

export const Route = createFileRoute("/_app/")({
  component: AppIndex,
})

function AppIndex() {
  return (
    <div className="space-y-6">
      <StoriesCarousel />
      <ComposerPlaceholder />
      <FeedPlaceholder />
    </div>
  )
}

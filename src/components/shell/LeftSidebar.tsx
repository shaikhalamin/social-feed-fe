import { EventsCard } from "@/components/shell/cards/EventsCard"
import { ExploreCard } from "@/components/shell/cards/ExploreCard"
import { SuggestedPeopleCard } from "@/components/shell/cards/SuggestedPeopleCard"

export function LeftSidebar() {
  return (
    <div className="space-y-6">
      <ExploreCard />
      <SuggestedPeopleCard />
      <EventsCard />
    </div>
  )
}

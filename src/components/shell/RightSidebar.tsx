import { YouMightLikeCard } from "@/components/shell/cards/YouMightLikeCard"
import { YourFriendsCard } from "@/components/shell/cards/YourFriendsCard"

export function RightSidebar() {
  return (
    <div className="space-y-6">
      <YouMightLikeCard />
      <YourFriendsCard />
    </div>
  )
}

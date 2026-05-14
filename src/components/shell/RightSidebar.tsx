import { FriendRequestsCard } from "@/components/shell/cards/FriendRequestsCard"
import { YouMightLikeCard } from "@/components/shell/cards/YouMightLikeCard"
import { YourFriendsCard } from "@/components/shell/cards/YourFriendsCard"

export function RightSidebar() {
  return (
    <div className="space-y-6">
      <FriendRequestsCard />
      <YouMightLikeCard />
      <YourFriendsCard />
    </div>
  )
}

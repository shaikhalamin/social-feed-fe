import { createFileRoute } from '@tanstack/react-router'
import { StoriesCarousel } from '@/components/shell/center-stubs/StoriesCarousel'
import { Composer } from '@/components/feed/Composer'
import { FeedList } from '@/components/feed/FeedList'

export const Route = createFileRoute('/_app/')({
  component: AppIndex,
})

function AppIndex() {
  return (
    <div className="space-y-6">
      <StoriesCarousel />
      <Composer />
      <FeedList />
    </div>
  )
}

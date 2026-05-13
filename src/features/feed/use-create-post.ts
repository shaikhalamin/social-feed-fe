import { useCreatePost } from '@/gen/api/hooks/useCreatePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { feedQueryKey } from './use-feed'
import type { FeedPages } from './feed-cache'
import { prependPostToFeed } from './feed-cache'

export function useCreatePostMutation() {
  return useCreatePost({
    mutation: {
      onSuccess: (response) => {
        queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
          prependPostToFeed(pages, response.data),
        )
      },
      onError: () => {
        toast.error("Couldn't post. Try again.")
      },
    },
  })
}

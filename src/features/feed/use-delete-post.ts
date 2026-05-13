import { useDeletePost } from '@/gen/api/hooks/useDeletePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { PostListSnapshot } from './feed-cache'
import {
  cancelPostListQueries,
  removePostFromAllPostListCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type DeletePostContext = { snapshot: PostListSnapshot }

export function useDeletePostMutation() {
  return useDeletePost<DeletePostContext>({
    mutation: {
      onMutate: async ({ id }) => {
        await cancelPostListQueries(queryClient)
        const snapshot = snapshotPostListCaches(queryClient)
        removePostFromAllPostListCaches(queryClient, id)
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
        toast.error("Couldn't delete post")
      },
    },
  })
}

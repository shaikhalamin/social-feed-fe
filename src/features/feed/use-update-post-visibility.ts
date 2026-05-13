import { useUpdatePostVisibility } from '@/gen/api/hooks/useUpdatePostVisibility.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { PostListSnapshot } from './feed-cache'
import {
  cancelPostListQueries,
  patchAllPostListCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type VisibilityContext = { snapshot: PostListSnapshot }

export function useUpdatePostVisibilityMutation() {
  return useUpdatePostVisibility<VisibilityContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        await cancelPostListQueries(queryClient)
        const snapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, id, (p) => ({
          ...p,
          visibility: data.visibility,
        }))
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
        toast.error("Couldn't update visibility")
      },
    },
  })
}

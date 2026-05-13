import { useLikePost } from '@/gen/api/hooks/useLikePost.ts'
import { useUnlikePost } from '@/gen/api/hooks/useUnlikePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { Post } from '@/gen/api/types/Post.ts'
import { feedQueryKey } from './use-feed'
import type { FeedPages } from './feed-cache'
import { patchPostInFeed } from './feed-cache'

type LikeContext = { previous: FeedPages | undefined }

function applyOptimisticToggle(
  pages: FeedPages | undefined,
  postId: string,
): FeedPages | undefined {
  return patchPostInFeed(pages, postId, (p) => ({
    ...p,
    viewerState: { ...p.viewerState, liked: !p.viewerState.liked },
    counters: {
      ...p.counters,
      likes: p.counters.likes + (p.viewerState.liked ? -1 : 1),
    },
  }))
}

export function useTogglePostLike() {
  const like = useLikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const previous = queryClient.getQueryData<FeedPages>(feedQueryKey)
        queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
          applyOptimisticToggle(pages, post_id),
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<FeedPages>(feedQueryKey, context.previous)
        }
        toast.error("Couldn't update like")
      },
    },
  })

  const unlike = useUnlikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const previous = queryClient.getQueryData<FeedPages>(feedQueryKey)
        queryClient.setQueryData<FeedPages>(feedQueryKey, (pages) =>
          applyOptimisticToggle(pages, post_id),
        )
        return { previous }
      },
      onError: (_err, _vars, context) => {
        if (context) {
          queryClient.setQueryData<FeedPages>(feedQueryKey, context.previous)
        }
        toast.error("Couldn't update like")
      },
    },
  })

  const toggle = (post: Post) => {
    if (post.viewerState.liked) {
      unlike.mutate({ post_id: post.id })
    } else {
      like.mutate({ post_id: post.id })
    }
  }

  const isPending = (postId: string): boolean => {
    if (like.isPending && like.variables.post_id === postId) return true
    if (unlike.isPending && unlike.variables.post_id === postId) return true
    return false
  }

  return { toggle, isPending }
}

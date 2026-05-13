import { useLikePost } from '@/gen/api/hooks/useLikePost.ts'
import { useUnlikePost } from '@/gen/api/hooks/useUnlikePost.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import type { Post } from '@/gen/api/types/Post.ts'
import type { PostListSnapshot } from './feed-cache'
import {
  patchAllPostListCaches,
  restorePostListCaches,
  snapshotPostListCaches,
} from './feed-cache'

type LikeContext = { snapshot: PostListSnapshot }

function applyToggle(post: Post): Post {
  return {
    ...post,
    viewerState: { ...post.viewerState, liked: !post.viewerState.liked },
    counters: {
      ...post.counters,
      likes: post.counters.likes + (post.viewerState.liked ? -1 : 1),
    },
  }
}

export function useTogglePostLike() {
  const like = useLikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const snapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, post_id, applyToggle)
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
        toast.error("Couldn't update like")
      },
    },
  })

  const unlike = useUnlikePost<LikeContext>({
    mutation: {
      onMutate: ({ post_id }) => {
        const snapshot = snapshotPostListCaches(queryClient)
        patchAllPostListCaches(queryClient, post_id, applyToggle)
        return { snapshot }
      },
      onError: (_err, _vars, context) => {
        if (context) restorePostListCaches(queryClient, context.snapshot)
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

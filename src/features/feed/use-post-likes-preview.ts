import { useQuery } from '@tanstack/react-query'
import { getPostLikesPreview } from '@/gen/api/clients/getPostLikesPreview.ts'
import type { GetPostLikesPreviewQueryResponse } from '@/gen/api/types/GetPostLikesPreview.ts'
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'

export function postLikesPreviewQueryKey(postId: string) {
  return ['post-likes-preview', postId] as const
}

export function usePostLikesPreview(
  postId: string,
  embedded: LikesPreview,
  enabled: boolean,
) {
  return useQuery<GetPostLikesPreviewQueryResponse>({
    queryKey: postLikesPreviewQueryKey(postId),
    queryFn: () => getPostLikesPreview({ post_id: postId }),
    initialData: { data: embedded },
    staleTime: 30_000,
    refetchOnMount: 'always',
    enabled,
  })
}

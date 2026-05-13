import { useQuery } from '@tanstack/react-query'
import { getCommentLikesPreview } from '@/gen/api/clients/getCommentLikesPreview.ts'
import type { GetCommentLikesPreviewQueryResponse } from '@/gen/api/types/GetCommentLikesPreview.ts'
import type { LikesPreview } from '@/gen/api/types/LikesPreview.ts'
import { commentLikesPreviewQueryKey } from './use-toggle-comment-like'

export function useCommentLikesPreview(
  commentId: string,
  embedded: LikesPreview,
  enabled: boolean,
) {
  return useQuery<GetCommentLikesPreviewQueryResponse>({
    queryKey: commentLikesPreviewQueryKey(commentId),
    queryFn: () => getCommentLikesPreview({ comment_id: commentId }),
    initialData: { data: embedded },
    staleTime: 30_000,
    refetchOnMount: 'always',
    enabled,
  })
}

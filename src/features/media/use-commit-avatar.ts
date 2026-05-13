import { useCommitAvatar } from '@/gen/api/hooks/useCommitAvatar.ts'
import { queryClient } from '@/lib/query-client'
import { useAuthStore } from '@/hooks/use-auth'
import { userQueryKey } from '@/features/friends/use-user'
import type { GetUserQueryResponse } from '@/gen/api/types/GetUser.ts'

export function useCommitAvatarMutation() {
  return useCommitAvatar({
    mutation: {
      onSuccess: (response, vars) => {
        const user = response.data
        const me = useAuthStore.getState().user
        if (me?.id === vars.id) {
          useAuthStore.getState().setUser(user)
        }
        queryClient.setQueryData<GetUserQueryResponse>(userQueryKey(vars.id), {
          data: user,
        })
      },
    },
  })
}

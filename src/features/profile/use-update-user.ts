import { useUpdateUser } from '@/gen/api/hooks/useUpdateUser.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { useAuthStore } from '@/hooks/use-auth'
import { userQueryKey } from '@/features/friends/use-user'
import type { AuthUser } from '@/hooks/use-auth'
import type { GetUserQueryResponse } from '@/gen/api/types/GetUser.ts'

type UpdateUserContext = {
  previousAuthUser: AuthUser | null
  previousUserQuery: GetUserQueryResponse | undefined
  isSelf: boolean
}

export function useUpdateUserMutation() {
  return useUpdateUser<UpdateUserContext>({
    mutation: {
      onMutate: async ({ id, data }) => {
        const key = userQueryKey(id)
        await queryClient.cancelQueries({ queryKey: key })
        const previousAuthUser = useAuthStore.getState().user
        const previousUserQuery =
          queryClient.getQueryData<GetUserQueryResponse>(key)
        const isSelf = previousAuthUser !== null && previousAuthUser.id === id
        const nowIso = new Date().toISOString()
        if (isSelf) {
          useAuthStore.getState().setUser({
            ...previousAuthUser,
            firstName: data.firstName ?? previousAuthUser.firstName,
            lastName: data.lastName ?? previousAuthUser.lastName,
            updatedAt: nowIso,
          })
        }
        if (previousUserQuery) {
          queryClient.setQueryData<GetUserQueryResponse>(key, {
            ...previousUserQuery,
            data: {
              ...previousUserQuery.data,
              firstName: data.firstName ?? previousUserQuery.data.firstName,
              lastName: data.lastName ?? previousUserQuery.data.lastName,
              updatedAt: nowIso,
            },
          })
        }
        return { previousAuthUser, previousUserQuery, isSelf }
      },
      onSuccess: (response, _vars, context) => {
        if (context.isSelf) {
          useAuthStore.getState().setUser(response.data)
        }
        queryClient.setQueryData<GetUserQueryResponse>(
          userQueryKey(response.data.id),
          response,
        )
      },
      onError: (_err, vars, context) => {
        if (!context) {
          toast.error("Couldn't update profile")
          return
        }
        if (context.isSelf) {
          useAuthStore.getState().setUser(context.previousAuthUser)
        }
        queryClient.setQueryData<GetUserQueryResponse>(
          userQueryKey(vars.id),
          context.previousUserQuery,
        )
        toast.error("Couldn't update profile")
      },
    },
  })
}

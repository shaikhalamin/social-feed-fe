import { useQuery } from '@tanstack/react-query'
import { getUser } from '@/gen/api/clients/getUser.ts'

export const userQueryKey = (userId: string) => ['user', userId] as const

export function useUser(userId: string) {
  return useQuery({
    queryKey: userQueryKey(userId),
    queryFn: () => getUser({ id: userId }),
    enabled: userId.length > 0,
  })
}

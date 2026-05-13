import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listUsers } from '@/gen/api/clients/listUsers.ts'
import type { User } from '@/gen/api/types/User.ts'

export const suggestedUsersQueryKey = ['users', 'suggested'] as const

export function useSuggestedUsers() {
  const query = useQuery({
    queryKey: suggestedUsersQueryKey,
    queryFn: () => listUsers({ params: { page: 1, limit: 4 } }),
  })

  const users = useMemo<User[]>(() => query.data?.data ?? [], [query.data])

  return { ...query, users }
}

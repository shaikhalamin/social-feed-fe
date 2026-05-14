import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/hooks/use-auth'
import { listUsers } from '@/gen/api/clients/listUsers.ts'
import type { User } from '@/gen/api/types/User.ts'

export const suggestedUsersQueryKey = ['users', 'suggested'] as const

export function useSuggestedUsers() {
  const currentUserId = useAuthStore((s) => s.user?.id)

  const query = useQuery({
    queryKey: suggestedUsersQueryKey,
    queryFn: () => listUsers({ params: { page: 1, limit: 4 } }),
  })

  const users = useMemo<User[]>(
    () =>
      (query.data?.data ?? []).filter((u) => u.id !== currentUserId),
    [query.data, currentUserId],
  )

  return { ...query, users }
}

import { useNavigate } from '@tanstack/react-router'
import { useDeleteUser } from '@/gen/api/hooks/useDeleteUser.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { broadcastLogout, clearAuth } from '@/lib/auth'
import { useAuthStore } from '@/hooks/use-auth'

export function useDeleteAccount() {
  const navigate = useNavigate()
  return useDeleteUser({
    mutation: {
      onSuccess: () => {
        clearAuth()
        useAuthStore.getState().reset()
        queryClient.clear()
        broadcastLogout()
        void navigate({ to: '/auth/login' })
      },
      onError: () => {
        toast.error("Couldn't delete account")
      },
    },
  })
}

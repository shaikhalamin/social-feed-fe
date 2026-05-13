import { useNavigate } from '@tanstack/react-router'
import { useDeleteUser } from '@/gen/api/hooks/useDeleteUser.ts'
import { queryClient } from '@/lib/query-client'
import { toast } from '@/components/ui/sonner'
import { clearAuth } from '@/lib/auth'
import { useAuthStore } from '@/hooks/use-auth'

export function useDeleteAccount() {
  const navigate = useNavigate()
  return useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.clear()
        clearAuth()
        useAuthStore.getState().reset()
        const channel = new BroadcastChannel('auth')
        channel.postMessage({ type: 'logout' })
        channel.close()
        void navigate({ to: '/auth/login' })
      },
      onError: () => {
        toast.error("Couldn't delete account")
      },
    },
  })
}

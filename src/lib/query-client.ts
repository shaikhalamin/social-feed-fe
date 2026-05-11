import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status: number } }).response
          ?.status
        if (status != null && [401, 403, 404].includes(status)) return false
        return failureCount < 2
      },
    },
  },
})

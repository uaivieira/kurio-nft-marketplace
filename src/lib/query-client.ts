import { QueryClient } from '@tanstack/react-query'
import { isApiError } from './api-error'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => isApiError(error) && error.retryable && failureCount < 2,
      retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
    },
    mutations: { retry: false },
  },
})

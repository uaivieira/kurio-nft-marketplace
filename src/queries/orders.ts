import { useQuery } from '@tanstack/react-query'
import { fetchOrder, fetchPendingOrders } from '@/api/orders'
import { scopeOf, useSession } from '@/lib/session-store'
import { isApiError } from '@/lib/api-error'
import { keys } from './keys'

/** Socket events update this query instantly; polling is the fallback while an order is pending. */
export function useOrder(id: string) {
  const scope = scopeOf(useSession())
  return useQuery({
    queryKey: keys.order(scope, id),
    queryFn: ({ signal }) => fetchOrder(id, signal),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 4000 : false),
    retry: (failureCount, error) => isApiError(error) && error.retryable && failureCount < 2,
  })
}

export function usePendingOrders() {
  const session = useSession()
  return useQuery({
    queryKey: keys.pendingOrders(scopeOf(session)),
    queryFn: ({ signal }) => fetchPendingOrders(signal),
    enabled: Boolean(session),
    staleTime: 5_000,
  })
}

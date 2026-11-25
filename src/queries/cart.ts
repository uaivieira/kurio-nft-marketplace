import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as cartApi from '@/api/cart'
import type { Cart } from '@/contracts/cart'
import type { Network } from '@/contracts/common'
import { scopeOf, useSession } from '@/lib/session-store'
import { keys } from './keys'

export function useCart() {
  const scope = scopeOf(useSession())
  return useQuery({ queryKey: keys.cart(scope), queryFn: ({ signal }) => cartApi.fetchCart(signal), staleTime: 10_000 })
}

export function useQuote(network: Network, cart: Cart | undefined) {
  const scope = scopeOf(useSession())
  return useQuery({
    queryKey: keys.quote(scope, network, cart?.version ?? -1),
    queryFn: ({ signal }) => cartApi.fetchQuote({ network }, signal),
    enabled: Boolean(cart),
    staleTime: 0,
    gcTime: 60_000,
    placeholderData: (previous) => previous,
  })
}

/** All cart mutations return the fresh cart, which replaces the cache entry and refreshes the quote. */
function useCartMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const scope = scopeOf(useSession())
  return useMutation({
    mutationFn,
    onSuccess: (cart) => {
      queryClient.setQueryData(keys.cart(scope), cart)
      void queryClient.invalidateQueries({ queryKey: ['private', scope, 'quote'] })
    },
  })
}

export const useAddToCart = () => useCartMutation(cartApi.addCartItem)
export const useSetQuantity = () => useCartMutation(({ lineId, quantity }: { lineId: string; quantity: number }) => cartApi.setCartQuantity(lineId, quantity))
export const useRemoveLine = () => useCartMutation((lineId: string) => cartApi.removeCartLine(lineId))
export const useApplyCoupon = () => useCartMutation((code: string) => cartApi.applyCoupon(code))
export const useRemoveCoupon = () => useCartMutation(() => cartApi.removeCoupon())
export const useAcknowledgePrices = () => useCartMutation(() => cartApi.acknowledgePrices())

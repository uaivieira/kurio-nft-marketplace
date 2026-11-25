import type { CatalogQuery } from '@/contracts/nft'

/**
 * Public data is keyed by its parameters. Private data lives under
 * ['private', <userId|guest>, ...] so it is isolated per user and can be wiped in one call.
 */
export const keys = {
  catalog: (query: CatalogQuery) => ['catalog', query] as const,
  nft: (id: string) => ['nft', id] as const,
  session: (scope: string) => ['private', scope, 'session'] as const,
  favorites: (scope: string) => ['private', scope, 'favorites'] as const,
  cart: (scope: string) => ['private', scope, 'cart'] as const,
  quote: (scope: string, network: string, cartVersion: number) => ['private', scope, 'quote', network, cartVersion] as const,
  profile: (scope: string) => ['private', scope, 'profile'] as const,
  wallets: (scope: string) => ['private', scope, 'wallets'] as const,
  order: (scope: string, id: string) => ['private', scope, 'order', id] as const,
  pendingOrders: (scope: string) => ['private', scope, 'orders', 'pending'] as const,
}

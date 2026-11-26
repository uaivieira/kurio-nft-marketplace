import { useRouterState } from '@tanstack/react-router'
import { z } from 'zod'
import { ethAmount, network } from '@/contracts/common'
import { CATALOG_SORTS, CATALOG_TABS, collection } from '@/contracts/nft'

/**
 * URL state of the catalog. Invalid values fall back to "unset" instead of failing the
 * route, so a hand-edited or stale link still opens the page.
 */
export const catalogSearch = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  collections: z.array(collection).optional().catch(undefined),
  networks: z.array(network).optional().catch(undefined),
  minPrice: ethAmount.optional().catch(undefined),
  maxPrice: ethAmount.optional().catch(undefined),
  tab: z.enum(CATALOG_TABS).optional().catch(undefined),
  sort: z.enum(CATALOG_SORTS).optional().catch(undefined),
  page: z.number().int().positive().optional().catch(undefined),
})
export type CatalogSearch = z.infer<typeof catalogSearch>

export const SORT_LABELS: Record<(typeof CATALOG_SORTS)[number], string> = {
  recent: 'Listados recentemente',
  'price-asc': 'Menor preço',
  'price-desc': 'Maior preço',
  name: 'Nome (A–Z)',
}

export const TAB_LABELS: Record<(typeof CATALOG_TABS)[number], string> = {
  all: 'Todos os NFTs',
  new: 'Novos lançamentos',
  trending: 'Em alta',
}

export const hasActiveFilters = (search: CatalogSearch) =>
  Boolean(search.q || search.collections?.length || search.networks?.length || search.minPrice || search.maxPrice)

/** Routes that render the catalog: the home and the dedicated marketplace page. */
export type CatalogPath = '/' | '/mercado'

/**
 * Where catalog navigation (filters, sort, search, tabs, pagination) should land: the page being
 * shown. The marketplace composition behind the login and signup dialogs belongs to `/mercado`.
 */
export function useCatalogPath(): CatalogPath {
  return useRouterState({ select: (state) => (state.location.pathname === '/' ? '/' : '/mercado') })
}

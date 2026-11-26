import { useRouterState } from '@tanstack/react-router'
import { z } from 'zod'
import { ethAmount, network } from '@/contracts/common'
import { CATALOG_SORTS, CATALOG_TABS, collection } from '@/contracts/nft'

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

export const hasActiveFilters = (search: CatalogSearch) =>
  Boolean(search.q || search.collections?.length || search.networks?.length || search.minPrice || search.maxPrice)

export type CatalogPath = '/' | '/mercado'

export function useCatalogPath(): CatalogPath {
  return useRouterState({ select: (state) => (state.location.pathname === '/' ? '/' : '/mercado') })
}

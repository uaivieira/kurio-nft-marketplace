import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query'
import { fetchCatalog, fetchNft } from '@/api/catalog'
import type { CatalogQuery } from '@/contracts/nft'
import { isApiError } from '@/lib/api-error'
import { keys } from './keys'

export const catalogQueryOptions = (query: CatalogQuery) =>
  queryOptions({
    queryKey: keys.catalog(query),
    queryFn: ({ signal }) => fetchCatalog(query, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const nftQueryOptions = (id: string) =>
  queryOptions({
    queryKey: keys.nft(id),
    queryFn: ({ signal }) => fetchNft(id, signal),
    staleTime: 15_000,
    retry: (failureCount, error) => isApiError(error) && error.retryable && failureCount < 2,
  })

export const useCatalog = (query: CatalogQuery) => useQuery(catalogQueryOptions(query))
export const useNft = (id: string) => useQuery(nftQueryOptions(id))

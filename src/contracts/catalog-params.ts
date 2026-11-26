import { catalogQuery, type CatalogQuery } from './nft'

export function toQueryString(query: CatalogQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  for (const value of query.collections ?? []) params.append('collection', value)
  for (const value of query.networks ?? []) params.append('network', value)
  if (query.minPrice) params.set('minPrice', query.minPrice)
  if (query.maxPrice) params.set('maxPrice', query.maxPrice)
  if (query.tab && query.tab !== 'all') params.set('tab', query.tab)
  if (query.sort && query.sort !== 'recent') params.set('sort', query.sort)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  return params
}

export function fromQueryString(params: URLSearchParams): CatalogQuery {
  const parsed = catalogQuery.safeParse({
    q: params.get('q') ?? undefined,
    collections: params.getAll('collection').length ? params.getAll('collection') : undefined,
    networks: params.getAll('network').length ? params.getAll('network') : undefined,
    minPrice: params.get('minPrice') ?? undefined,
    maxPrice: params.get('maxPrice') ?? undefined,
    tab: params.get('tab') ?? undefined,
    sort: params.get('sort') ?? undefined,
    page: params.get('page') ? Number(params.get('page')) : undefined,
  })
  return parsed.success ? parsed.data : {}
}

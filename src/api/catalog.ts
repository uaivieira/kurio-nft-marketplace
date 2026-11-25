import { toQueryString } from '@/contracts/catalog-params'
import { favoritesList } from '@/contracts/favorites'
import { catalogPage, nftDetail, type CatalogQuery } from '@/contracts/nft'
import { http } from '@/lib/http'

export const fetchCatalog = async (query: CatalogQuery, signal?: AbortSignal) =>
  catalogPage.parse((await http.get('/nfts', { params: toQueryString(query), signal })).data)

export const fetchNft = async (id: string, signal?: AbortSignal) => nftDetail.parse((await http.get(`/nfts/${encodeURIComponent(id)}`, { signal })).data)

export const fetchFavorites = async (signal?: AbortSignal) => favoritesList.parse((await http.get('/favorites', { signal })).data)
export const addFavorite = async (nftId: string) => favoritesList.parse((await http.put(`/favorites/${encodeURIComponent(nftId)}`)).data)
export const removeFavorite = async (nftId: string) => favoritesList.parse((await http.delete(`/favorites/${encodeURIComponent(nftId)}`)).data)

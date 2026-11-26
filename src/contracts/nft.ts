import { z } from 'zod'
import type ptBR from '@/i18n/locales/pt-BR'
import { ethAmount, isoDate, network, NETWORKS } from './common'

export const COLLECTIONS = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export const collection = z.enum(COLLECTIONS)
export type Collection = z.infer<typeof collection>
export const COLLECTION_LABEL_KEYS = {
  'arte-digital': 'catalog.collections.digitalArt',
  fotografia: 'catalog.collections.photography',
  musica: 'catalog.collections.music',
  'arte-3d': 'catalog.collections.art3d',
  colecionaveis: 'catalog.collections.collectibles',
  generativa: 'catalog.collections.generative',
  jogos: 'catalog.collections.games',
  assinaturas: 'catalog.collections.subscriptions',
  utilidade: 'catalog.collections.utility',
} as const satisfies Record<Collection, `catalog.collections.${keyof (typeof ptBR)['catalog']['collections']}`>

export const ARTWORKS = ['emerald', 'sage', 'ivory', 'golden'] as const
export const artwork = z.enum(ARTWORKS)
export type Artwork = z.infer<typeof artwork>

export const edition = z.object({
  id: z.string(),
  label: z.string(),
  supply: z.number().int().positive().nullable(),
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
  price: ethAmount,
})
export type Edition = z.infer<typeof edition>

export const nftSummary = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  artwork,
  collection,
  network,
  price: ethAmount,
  compareAtPrice: ethAmount.nullable(),
  badge: z.enum(['raro']).nullable(),
  totalAvailable: z.number().int().nonnegative(),
  listedAt: isoDate,
  version: z.number().int().nonnegative(),
})
export type NftSummary = z.infer<typeof nftSummary>

export const nftDetail = nftSummary.extend({
  collectionName: z.string(),
  creator: z.string(),
  description: z.string(),
  story: z.array(z.string()),
  attributes: z.array(z.string()),
  contractAddress: z.string(),
  royaltiesPercent: z.number(),
  rating: z.number(),
  reviewCount: z.number().int(),
  editions: z.array(edition),
  related: z.array(nftSummary),
})
export type NftDetail = z.infer<typeof nftDetail>

export const CATALOG_SORTS = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const CATALOG_TABS = ['all', 'new', 'trending'] as const
export const CATALOG_PAGE_SIZE = 9

export const catalogQuery = z.object({
  q: z.string().trim().max(80).optional(),
  collections: z.array(collection).optional(),
  networks: z.array(z.enum(NETWORKS)).optional(),
  minPrice: ethAmount.optional(),
  maxPrice: ethAmount.optional(),
  tab: z.enum(CATALOG_TABS).optional(),
  sort: z.enum(CATALOG_SORTS).optional(),
  page: z.number().int().positive().optional(),
})
export type CatalogQuery = z.infer<typeof catalogQuery>

export const facetCount = z.object({ value: z.string(), count: z.number().int() })

export const catalogPage = z.object({
  items: z.array(nftSummary),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  facets: z.object({
    collections: z.array(facetCount),
    networks: z.array(facetCount),
    priceRange: z.object({ min: ethAmount, max: ethAmount }),
  }),
  featured: nftSummary.nullable(),
})
export type CatalogPage = z.infer<typeof catalogPage>

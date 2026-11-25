import { CATALOG_PAGE_SIZE, type CatalogPage, type CatalogQuery, type NftDetail, type NftSummary } from '@/contracts/nft'
import { COLLECTIONS } from '@/contracts/nft'
import { NETWORKS } from '@/contracts/common'
import { compareEth, fromWei, toWei } from '@/lib/eth'
import { FEATURED_NFT_ID, type NftRecord } from '../db/seed'
import { db } from '../db/state'
import { MockHttpError } from '../http'
import { runtime } from '../scenarios'

export function summarize(nft: NftRecord): NftSummary {
  const inStock = nft.editions.filter((edition) => edition.available > 0)
  const pool = inStock.length ? inStock : nft.editions
  const price = pool.reduce((min, edition) => (compareEth(edition.price, min) < 0 ? edition.price : min), pool[0]!.price)
  return {
    id: nft.id,
    tokenId: nft.tokenId,
    name: nft.name,
    artwork: nft.artwork,
    collection: nft.collection,
    network: nft.network,
    price,
    compareAtPrice: nft.compareAtPrice,
    badge: nft.badge,
    totalAvailable: nft.editions.reduce((sum, edition) => sum + edition.available, 0),
    listedAt: nft.listedAt,
    version: nft.version,
  }
}

type Predicate = (nft: NftSummary) => boolean

function buildFilters(query: CatalogQuery) {
  const search = query.q?.toLowerCase()
  const min = query.minPrice ? toWei(query.minPrice) : null
  const max = query.maxPrice ? toWei(query.maxPrice) : null
  const newest = new Set(
    Object.values(db.nfts)
      .sort((a, b) => b.listedAt.localeCompare(a.listedAt))
      .slice(0, 12)
      .map((nft) => nft.id),
  )

  const text: Predicate = (nft) => !search || nft.name.toLowerCase().includes(search) || nft.tokenId.includes(search)
  const collections: Predicate = (nft) => !query.collections?.length || query.collections.includes(nft.collection)
  const networks: Predicate = (nft) => !query.networks?.length || query.networks.includes(nft.network)
  const price: Predicate = (nft) => {
    const wei = toWei(nft.price)
    return (min === null || wei >= min) && (max === null || wei <= max)
  }
  const tab: Predicate = (nft) => {
    if (query.tab === 'new') return newest.has(nft.id)
    if (query.tab === 'trending') return db.nfts[nft.id]?.trending === true
    return true
  }
  return { text, collections, networks, price, tab }
}

export function queryCatalog(query: CatalogQuery): CatalogPage {
  const all = Object.values(db.nfts).map(summarize)
  const filters = buildFilters(query)
  const run = (omit?: keyof typeof filters) =>
    all.filter((nft) => Object.entries(filters).every(([key, fn]) => key === omit || fn(nft)))

  const filtered = runtime.scenario === 'empty-catalog' ? [] : run()
  const sort = query.sort ?? 'recent'
  filtered.sort((a, b) => {
    switch (sort) {
      case 'price-asc':
        return compareEth(a.price, b.price) || a.name.localeCompare(b.name)
      case 'price-desc':
        return compareEth(b.price, a.price) || a.name.localeCompare(b.name)
      case 'name':
        return a.name.localeCompare(b.name)
      default:
        return b.listedAt.localeCompare(a.listedAt)
    }
  })

  const pageSize = CATALOG_PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(query.page ?? 1, totalPages)
  const count = (items: NftSummary[], pick: (nft: NftSummary) => string, values: readonly string[]) =>
    values.map((value) => ({ value, count: items.filter((nft) => pick(nft) === value).length }))

  const prices = all.map((nft) => toWei(nft.price))
  const featuredRecord = db.nfts[FEATURED_NFT_ID]

  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: filtered.length,
    totalPages,
    facets: {
      collections: count(run('collections'), (nft) => nft.collection, COLLECTIONS),
      networks: count(run('networks'), (nft) => nft.network, NETWORKS),
      priceRange: {
        min: fromWei(prices.reduce((a, b) => (a < b ? a : b), prices[0] ?? 0n)),
        max: fromWei(prices.reduce((a, b) => (a > b ? a : b), prices[0] ?? 0n)),
      },
    },
    featured: featuredRecord ? summarize(featuredRecord) : null,
  }
}

export function getNftDetail(id: string): NftDetail {
  const nft = db.nfts[id]
  if (!nft) throw new MockHttpError('NOT_FOUND', 'NFT não encontrado.')
  const related = Object.values(db.nfts)
    .filter((other) => other.id !== nft.id && other.collection === nft.collection)
    .concat(Object.values(db.nfts).filter((other) => other.id !== nft.id && other.collection !== nft.collection))
    .slice(0, 5)
    .map(summarize)
  const label = nft.name
  return {
    ...summarize(nft),
    collectionName: 'Kurio Apes',
    creator: nft.creator,
    description: `Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.`,
    story: [
      `${label} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${nft.network === 'ethereum' ? 'Ethereum' : nft.network === 'polygon' ? 'Polygon' : 'Solana'}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
      `A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. ${nft.creator} recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.`,
    ],
    attributes: ['Óculos', 'Esmeralda', 'Raro'],
    contractAddress: nft.contractAddress,
    royaltiesPercent: 5,
    rating: nft.rating,
    reviewCount: nft.reviewCount,
    editions: nft.editions,
    related,
  }
}


import type { Artwork, Collection, Edition } from '@/contracts/nft'
import { ARTWORKS, COLLECTIONS } from '@/contracts/nft'
import type { Network } from '@/contracts/common'
import { mulEth, percentOfEth } from '@/lib/eth'

export const SEED_NOW = Date.parse('2026-07-29T12:00:00Z')

export interface NftRecord {
  id: string
  tokenId: string
  name: string
  artwork: Artwork
  collection: Collection
  network: Network
  compareAtPrice: string | null
  badge: 'raro' | null
  listedAt: string
  trending: boolean
  creator: string
  rating: number
  reviewCount: number
  contractAddress: string
  version: number
  editions: Edition[]
}

export interface SeedUser {
  id: string
  email: string
  username: string
  displayName: string
  ensLabel: string
  walletNickname: string
}

export const SEED_PASSWORD = 'Kurio#2026'
export const SEED_PASSWORD_HASH = '2b11159c92eceb3c2f19d11e559eadd95eda9f670575ca77e8901a85f529754c'

export const SEED_USERS: SeedUser[] = [
  { id: 'u_ana', email: 'ana@kurio.test', username: 'ana', displayName: 'Ana Souza', ensLabel: 'anasouza', walletNickname: 'Carteira da Ana' },
  { id: 'u_bruno', email: 'bruno@kurio.test', username: 'bruno', displayName: 'Bruno Lima', ensLabel: 'brunolima', walletNickname: 'Carteira do Bruno' },
]

export const SEED_WALLETS = {
  u_ana: {
    primary: { provider: 'metamask', address: '0x7A42c0Ffee1d2B3a4C5d6E7f8091a2b3C4D519E8', nickname: 'MetaMask principal' },
    secondary: { provider: 'coinbase', address: '0x91Bc3d4E5f60718293a4B5c6D7e8F9012aB3c4D5', nickname: 'Coinbase reserva' },
  },
  u_bruno: null,
} as const

export const COUPONS = {
  KURIO10: { percentOff: 10, expiresAt: '2099-01-01T00:00:00Z' },
  EXPIRED5: { percentOff: 5, expiresAt: '2026-01-01T00:00:00Z' },
  FLASH15: { percentOff: 15, expiresAt: '2030-01-01T00:00:00Z' },
} as const

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hex(rand: () => number, length: number) {
  let out = ''
  while (out.length < length) out += Math.floor(rand() * 16).toString(16)
  return out
}

const slug = (value: string) => value.toLowerCase().replace(/\s+/g, '-')

interface Spec {
  name: string
  number: number
  artwork: Artwork
  price: string
  compareAt?: string
  badge?: 'raro'
  collection?: Collection
  network?: Network
}

const FIGMA_SPECS: Spec[] = [
  { name: 'Emerald Ape', number: 42, artwork: 'emerald', price: '1.19', collection: 'arte-digital', network: 'ethereum' },
  { name: 'Sage Nomad', number: 9, artwork: 'sage', price: '1.69', collection: 'arte-digital', network: 'ethereum' },
  { name: 'Neon Vessel', number: 552, artwork: 'emerald', price: '1.99', compareAt: '2.29', badge: 'raro', collection: 'arte-digital', network: 'polygon' },
  { name: 'Cosmic Bloom', number: 118, artwork: 'sage', price: '1.29', collection: 'generativa', network: 'ethereum' },
  { name: 'Violet Nomad', number: 314, artwork: 'sage', price: '1.39', collection: 'arte-digital', network: 'solana' },
  { name: 'Ivory Baron', number: 88, artwork: 'ivory', price: '1.79', collection: 'colecionaveis', network: 'ethereum' },
  { name: 'Golden Beat', number: 207, artwork: 'golden', price: '0.99', collection: 'musica', network: 'polygon' },
  { name: 'Golden Frequency', number: 71, artwork: 'sage', price: '0.59', collection: 'musica', network: 'solana' },
  { name: 'Golden Signal', number: 160, artwork: 'golden', price: '0.39', collection: 'musica', network: 'ethereum' },
]

const ADJECTIVES = ['Crimson', 'Amber', 'Lunar', 'Solar', 'Velvet', 'Onyx', 'Coral', 'Jade', 'Neon', 'Cosmic', 'Ivory', 'Violet']
const NOUNS = ['Ape', 'Nomad', 'Vessel', 'Bloom', 'Baron', 'Beat', 'Signal', 'Echo', 'Relic', 'Sentinel', 'Oracle', 'Drifter']
const NETWORKS: Network[] = ['ethereum', 'ethereum', 'polygon', 'solana']

const OVERRIDES: Record<string, { price?: string; available?: Record<string, number> }> = {
  'lunar-echo-027': { available: { e1: 0, e10: 0, e50: 2, open: 0 } },
  'onyx-relic-404': { available: { e1: 0, e10: 0, e50: 0, open: 0 } },
  'amber-oracle-500': { price: '12.30' },
  'jade-drifter-002': { price: '0.02' },
}

function buildEditions(base: string, rand: () => number): Edition[] {
  const roll = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
  return [
    { id: 'e1', label: '1/1', supply: 1, available: 1, maxPerOrder: 1, price: mulEth(base, 2) },
    { id: 'e10', label: '1/10', supply: 10, available: roll(3, 10), maxPerOrder: 5, price: percentOfEth(base, 15000) },
    { id: 'e50', label: '1/50', supply: 50, available: roll(20, 50), maxPerOrder: 10, price: base },
    { id: 'open', label: 'ABERTA', supply: null, available: 500, maxPerOrder: 10, price: percentOfEth(base, 11000) },
  ]
}

export function buildNfts(): NftRecord[] {
  const rand = mulberry32(2026)
  const specs: Spec[] = [...FIGMA_SPECS]
  const used = new Set(specs.map((spec) => slug(`${spec.name}-${String(spec.number).padStart(3, '0')}`)))

  const extras: Array<[string, string, number, string]> = [
    ['Lunar', 'Echo', 27, '0.85'],
    ['Onyx', 'Relic', 404, '2.40'],
    ['Amber', 'Oracle', 500, '12.30'],
    ['Jade', 'Drifter', 2, '0.02'],
  ]
  for (const [adjective, noun, number, price] of extras) {
    specs.push({ name: `${adjective} ${noun}`, number, artwork: ARTWORKS[specs.length % ARTWORKS.length]!, price })
    used.add(slug(`${adjective} ${noun}-${String(number).padStart(3, '0')}`))
  }

  while (specs.length < 48) {
    const name = `${ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)]} ${NOUNS[Math.floor(rand() * NOUNS.length)]}`
    const number = 1 + Math.floor(rand() * 899)
    const key = slug(`${name}-${String(number).padStart(3, '0')}`)
    if (used.has(key)) continue
    used.add(key)
    const price = (0.05 + rand() * 6).toFixed(2)
    specs.push({
      name,
      number,
      artwork: ARTWORKS[Math.floor(rand() * ARTWORKS.length)]!,
      price,
      compareAt: rand() < 0.1 ? (Number(price) * 1.15).toFixed(2) : undefined,
      badge: rand() < 0.15 ? 'raro' : undefined,
    })
  }

  return specs.map((spec, index) => {
    const tokenId = String(spec.number).padStart(4, '0')
    const id = slug(`${spec.name}-${String(spec.number).padStart(3, '0')}`)
    const override = OVERRIDES[id]
    const base = override?.price ?? spec.price
    const editions = buildEditions(base, rand)
    if (override?.available) {
      for (const edition of editions) edition.available = override.available[edition.id] ?? edition.available
    }
    return {
      id,
      tokenId,
      name: `${spec.name} #${String(spec.number).padStart(3, '0')}`,
      artwork: spec.artwork,
      collection: spec.collection ?? COLLECTIONS[index % COLLECTIONS.length]!,
      network: spec.network ?? NETWORKS[Math.floor(rand() * NETWORKS.length)]!,
      compareAtPrice: spec.compareAt ?? null,
      badge: spec.badge ?? null,
      listedAt: new Date(SEED_NOW - index * 6 * 3600_000).toISOString(),
      trending: index % 3 === 1,
      creator: 'Nova Sato',
      rating: 4.5,
      reviewCount: 19,
      contractAddress: `0x${hex(rand, 4)}...${hex(rand, 4).toUpperCase()}`,
      version: 1,
      editions,
    }
  })
}

export const FEATURED_NFT_ID = 'cosmic-bloom-118'

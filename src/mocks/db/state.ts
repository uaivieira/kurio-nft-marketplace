import type { WalletProvider } from '@/contracts/common'
import type { Order } from '@/contracts/order'
import type { RealtimeEvent } from '@/contracts/events'
import type { Profile } from '@/contracts/profile'
import type { Wallet } from '@/contracts/wallet'
import { buildNfts, SEED_PASSWORD_HASH, SEED_USERS, SEED_WALLETS, type NftRecord } from './seed'

export const DB_STORAGE_KEY = 'kurio:mockdb:v1'
const SCHEMA_VERSION = 1

export interface UserRecord {
  id: string
  email: string
  username: string
  displayName: string
  ensLabel: string
  ensSuffix: Profile['ensSuffix']
  walletNickname: string
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
  updatedAt: string
}

export interface SessionRecord {
  userId: string
  expiresAt: number
}

export interface CartLineRecord {
  id: string
  nftId: string
  editionId: string
  quantity: number
  priceWhenAdded: string
}

export interface CartRecord {
  id: string
  lines: CartLineRecord[]
  couponCode: string | null
  version: number
}

export interface WalletSlots {
  primary: Wallet | null
  secondary: Wallet | null
  secondarySameAsPrimary: boolean
}

export interface ConnectionRecord {
  id: string
  userId: string
  walletId: string
  provider: WalletProvider
  network: Order['network']
  address: string
  connectedAt: string
}

export interface OrderRecord extends Order {
  userId: string
  resolveAt: number | null
  outcome: 'confirmed' | 'rejected'
}

export interface IdempotencyRecord {
  fingerprint: string
  orderId: string
}

export interface DbState {
  schemaVersion: number
  seq: number
  users: Record<string, UserRecord>
  sessions: Record<string, SessionRecord>
  nfts: Record<string, NftRecord>
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  wallets: Record<string, WalletSlots>
  connections: Record<string, ConnectionRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, IdempotencyRecord>
}

export let db: DbState = emptyState()

function emptyState(): DbState {
  return {
    schemaVersion: SCHEMA_VERSION,
    seq: 0,
    users: {},
    sessions: {},
    nfts: {},
    favorites: {},
    carts: {},
    wallets: {},
    connections: {},
    orders: {},
    idempotency: {},
  }
}

export function nextId(prefix: string): string {
  db.seq += 1
  return `${prefix}_${db.seq.toString(36).padStart(4, '0')}`
}

export function persist() {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db))
  } catch {
    /* storage full or unavailable: the in-memory state stays authoritative */
  }
}

/* ---------------------------------------------------------------- passwords */

const PBKDF2_ITERATIONS = 60_000
const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

export async function hashPassword(password: string, salt = toHex(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: PBKDF2_ITERATIONS },
    key,
    256,
  )
  return { salt, hash: toHex(new Uint8Array(bits)) }
}

export async function verifyPassword(user: UserRecord, password: string) {
  const { hash } = await hashPassword(password, user.passwordSalt)
  return hash === user.passwordHash
}

/* --------------------------------------------------------------------- seed */

async function seed(): Promise<DbState> {
  const state = emptyState()
  for (const nft of buildNfts()) state.nfts[nft.id] = nft

  // PBKDF2(SEED_PASSWORD, 'kurio-seed-salt', 60k, SHA-256), precomputed so the first boot does no key stretching.
  const salt = 'kurio-seed-salt'
  const hash = SEED_PASSWORD_HASH
  const now = new Date().toISOString()
  for (const seedUser of SEED_USERS) {
    state.users[seedUser.id] = {
      ...seedUser,
      ensSuffix: '.eth',
      avatarUrl: null,
      passwordSalt: salt,
      passwordHash: hash,
      updatedAt: now,
    }
    state.favorites[seedUser.id] = []
    const walletSeed = SEED_WALLETS[seedUser.id as keyof typeof SEED_WALLETS]
    const user = state.users[seedUser.id]!
    const buildWallet = (slot: 'primary' | 'secondary', data: { provider: WalletProvider; address: string; nickname: string }): Wallet => ({
      id: `w_${seedUser.id}_${slot}`,
      slot,
      displayName: user.displayName,
      nickname: data.nickname,
      network: 'ethereum',
      profileName: user.username,
      address: data.address,
      secondaryAddress: '',
      provider: data.provider,
      referralCode: 'KURIO2026',
      email: user.email,
      ensLabel: user.ensLabel,
      ensSuffix: '.eth',
      updatedAt: now,
    })
    state.wallets[seedUser.id] = walletSeed
      ? {
          primary: buildWallet('primary', walletSeed.primary),
          secondary: buildWallet('secondary', walletSeed.secondary),
          secondarySameAsPrimary: false,
        }
      : { primary: null, secondary: null, secondarySameAsPrimary: false }
  }
  return state
}

export async function initDb() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DbState
      if (parsed.schemaVersion === SCHEMA_VERSION) {
        db = parsed
        return
      }
    }
  } catch {
    /* corrupted snapshot: fall through to a fresh seed */
  }
  db = await seed()
  persist()
}

/** Restores the known scenario data completely (catalog, users, carts, orders, sessions). */
export async function resetDb() {
  db = await seed()
  persist()
}

/* ------------------------------------------------------------------- events */

type Listener = (event: RealtimeEvent) => void
const listeners = new Set<Listener>()
export const eventLog: RealtimeEvent[] = []

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Every event goes through here so REST state and socket events cannot diverge. */
export function publish(event: RealtimeEvent) {
  eventLog.push(event)
  if (eventLog.length > 200) eventLog.shift()
  for (const listener of listeners) listener(event)
}

export const eventId = () => nextId('evt')

import { orderUpdatedEvent } from '@/contracts/events'
import type { CreateOrderInput, Order } from '@/contracts/order'
import { percentOfEth } from '@/lib/eth'
import { hex } from '../db/seed'
import { db, eventId, nextId, persist, publish, type OrderRecord, type UserRecord } from '../db/state'
import { MockHttpError } from '../http'
import { once, runtime } from '../scenarios'
import { computeQuote, getOrCreateCart } from './cart'
import { updateEdition } from './inventory'
import { getWallets } from './wallets'

const SETTLE_AFTER_MS = 2500

export const toOrder = (record: OrderRecord): Order => {
  const { userId: _userId, resolveAt: _resolveAt, outcome: _outcome, ...order } = record
  return order
}

function fingerprintOf(input: CreateOrderInput) {
  return JSON.stringify([input.quoteVersion, input.walletId, input.connectionId, input.network, input.buyer])
}

function transactionHash(seq: number) {
  let a = seq * 2654435761
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return `0x${hex(rand, 64)}`
}

/** Applies the scenario's one-shot mutation just before the quote is revalidated. */
function applyCheckoutScenario(userId: string) {
  const cart = db.carts[`user:${userId}`]
  const first = cart?.lines[0]
  if (!first) return
  const edition = db.nfts[first.nftId]?.editions.find((candidate) => candidate.id === first.editionId)
  if (!edition) return
  if (runtime.scenario === 'price-change-during-checkout' && once('price-change')) {
    updateEdition(first.nftId, first.editionId, { price: percentOfEth(edition.price, 11000) })
  }
  if (runtime.scenario === 'sold-out-during-checkout' && once('sold-out')) {
    updateEdition(first.nftId, first.editionId, { available: 0 })
  }
}

export function createOrder(user: UserRecord, key: string, input: CreateOrderInput): { order: Order; replay: boolean } {
  const idemKey = `${user.id}:${key}`
  const fingerprint = fingerprintOf(input)
  const existing = db.idempotency[idemKey]
  if (existing) {
    if (existing.fingerprint !== fingerprint) {
      throw new MockHttpError('IDEMPOTENCY_MISMATCH', 'Esta chave de idempotência já foi usada com outro conteúdo.')
    }
    const record = db.orders[existing.orderId]
    if (record) return { order: toOrder(record), replay: true }
  }

  applyCheckoutScenario(user.id)

  const cart = getOrCreateCart(`user:${user.id}`)
  if (!cart.lines.length) throw new MockHttpError('VALIDATION', 'Seu carrinho está vazio.')

  const wallets = getWallets(user)
  const wallet = [wallets.primary, wallets.secondary].find((candidate) => candidate?.id === input.walletId)
  const connection = db.connections[input.connectionId]
  if (!wallet || !connection || connection.userId !== user.id || connection.walletId !== wallet.id) {
    throw new MockHttpError('VALIDATION', 'Conecte uma carteira cadastrada para continuar.', { wallet: 'Carteira não conectada.' })
  }

  const quote = computeQuote(cart, input.network)
  if (!quote.purchasable) {
    throw new MockHttpError('AVAILABILITY_CONFLICT', quote.issues.find((issue) => issue.kind !== 'price-changed')?.message ?? 'Itens indisponíveis.', undefined, { quote })
  }
  if (quote.version !== input.quoteVersion) {
    throw new MockHttpError('QUOTE_STALE', 'A cotação mudou. Revise os valores antes de confirmar.', undefined, { quote })
  }

  const now = new Date().toISOString()
  const id = nextId('ord')
  const hold = runtime.scenario === 'order-hold'
  const record: OrderRecord = {
    id,
    userId: user.id,
    status: 'pending',
    version: 1,
    createdAt: now,
    updatedAt: now,
    network: input.network,
    wallet: { id: wallet.id, nickname: wallet.nickname, provider: wallet.provider, address: wallet.address },
    lines: quote.lines,
    subtotal: quote.subtotal,
    discount: quote.discount,
    networkFee: quote.networkFee,
    total: quote.total,
    couponCode: quote.coupon?.status === 'applied' ? quote.coupon.code : null,
    transactionHash: null,
    explorerUrl: null,
    failureReason: null,
    resolveAt: hold ? null : Date.now() + SETTLE_AFTER_MS,
    outcome: runtime.scenario === 'payment-rejected' ? 'rejected' : 'confirmed',
  }
  db.orders[id] = record
  db.idempotency[idemKey] = { fingerprint, orderId: id }
  persist()
  if (!hold) scheduleSettlement()
  return { order: toOrder(record), replay: false }
}

function emitOrder(record: OrderRecord) {
  publish(
    orderUpdatedEvent.parse({
      eventId: eventId(),
      type: 'order.updated',
      resource: { kind: 'order', id: record.id },
      userId: record.userId,
      version: record.version,
      occurredAt: record.updatedAt,
      data: { orderId: record.id, status: record.status, failureReason: record.failureReason },
    }),
  )
}

function settle(record: OrderRecord, outcome: 'confirmed' | 'rejected') {
  if (record.status !== 'pending') return
  let reason: string | null = null

  if (outcome === 'confirmed') {
    const short = record.lines.find((line) => {
      const edition = db.nfts[line.nftId]?.editions.find((candidate) => candidate.id === line.editionId)
      return !edition || edition.available < line.quantity
    })
    if (short) {
      outcome = 'rejected'
      reason = `${short.name} (${short.editionLabel}) não tem mais unidades disponíveis.`
    }
  } else {
    reason = 'Pagamento recusado pela carteira.'
  }

  if (outcome === 'confirmed') {
    for (const line of record.lines) {
      const edition = db.nfts[line.nftId]?.editions.find((candidate) => candidate.id === line.editionId)
      if (edition) updateEdition(line.nftId, line.editionId, { available: edition.available - line.quantity })
    }
    const cart = db.carts[`user:${record.userId}`]
    if (cart) {
      for (const line of record.lines) {
        const cartLine = cart.lines.find((candidate) => candidate.nftId === line.nftId && candidate.editionId === line.editionId)
        if (cartLine) cartLine.quantity -= line.quantity
      }
      cart.lines = cart.lines.filter((line) => line.quantity > 0)
      if (!cart.lines.length) cart.couponCode = null
      cart.version += 1
    }
    record.transactionHash = transactionHash(Object.keys(db.orders).length + db.seq)
    record.explorerUrl = `https://etherscan.io/tx/${record.transactionHash}`
  }

  record.status = outcome
  record.failureReason = reason
  record.version += 1
  record.updatedAt = new Date().toISOString()
  record.resolveAt = null
  persist()
  emitOrder(record)
}

export function settleDue(now = Date.now()) {
  for (const record of Object.values(db.orders)) {
    if (record.status === 'pending' && record.resolveAt !== null && record.resolveAt <= now) settle(record, record.outcome)
  }
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Pending orders resolve by wall-clock time, so a page refresh does not lose them. */
export function scheduleSettlement() {
  clearTimeout(timer)
  const dues = Object.values(db.orders)
    .filter((record) => record.status === 'pending' && record.resolveAt !== null)
    .map((record) => record.resolveAt as number)
  if (!dues.length) return
  const wait = Math.max(0, Math.min(...dues) - Date.now())
  timer = setTimeout(() => {
    settleDue()
    scheduleSettlement()
  }, wait)
}

export function resolveOrder(orderId: string, outcome: 'confirmed' | 'rejected') {
  const record = db.orders[orderId]
  if (!record) throw new MockHttpError('NOT_FOUND', 'Pedido não encontrado.')
  settle(record, outcome)
}

export function getOrderFor(user: UserRecord, orderId: string): Order {
  settleDue()
  const record = db.orders[orderId]
  if (!record) throw new MockHttpError('NOT_FOUND', 'Pedido não encontrado.')
  if (record.userId !== user.id) throw new MockHttpError('FORBIDDEN', 'Você não tem acesso a este pedido.')
  return toOrder(record)
}

export function listOrdersFor(user: UserRecord, status?: string): Order[] {
  settleDue()
  return Object.values(db.orders)
    .filter((record) => record.userId === user.id && (!status || record.status === status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toOrder)
}

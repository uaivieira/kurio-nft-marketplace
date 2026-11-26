import type { Cart, CartLine, Quote, QuoteIssue } from '@/contracts/cart'
import type { Network } from '@/contracts/common'
import { addEth, fromWei, mulEth, percentOfEth, subEth, toWei } from '@/lib/eth'
import { COUPONS } from '../db/seed'
import { db, nextId, persist, type CartLineRecord, type CartRecord, type UserRecord } from '../db/state'
import { MockHttpError } from '../http'
import { validation } from '@/i18n/keys'

const NETWORK_FEES: Record<Network, string> = { ethereum: '0.016', polygon: '0.002', solana: '0.001' }
const QUOTE_TTL_MS = 5 * 60_000

export const cartKey = (user: UserRecord | null, guestId: string | null) => {
  if (user) return `user:${user.id}`
  if (!guestId) throw new MockHttpError('VALIDATION', 'Guest id header is missing.', undefined, { reason: 'guestIdMissing' })
  return `guest:${guestId}`
}

export function getOrCreateCart(key: string): CartRecord {
  let cart = db.carts[key]
  if (!cart) {
    cart = { id: nextId('cart'), lines: [], couponCode: null, version: 0 }
    db.carts[key] = cart
  }
  return cart
}

function touch(cart: CartRecord) {
  cart.version += 1
  persist()
}

function viewLine(line: CartLineRecord): CartLine | null {
  const nft = db.nfts[line.nftId]
  const edition = nft?.editions.find((candidate) => candidate.id === line.editionId)
  if (!nft || !edition) return null
  return {
    id: line.id,
    nftId: nft.id,
    editionId: edition.id,
    name: nft.name,
    tokenId: nft.tokenId,
    artwork: nft.artwork,
    editionLabel: edition.label,
    quantity: line.quantity,
    unitPrice: edition.price,
    priceWhenAdded: line.priceWhenAdded,
    available: edition.available,
    maxPerOrder: edition.maxPerOrder,
  }
}

export function viewCart(cart: CartRecord, owner: 'guest' | 'user'): Cart {
  const lines = cart.lines.map(viewLine).filter((line): line is CartLine => line !== null)
  return {
    id: cart.id,
    owner,
    lines,
    couponCode: cart.couponCode,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    version: cart.version,
  }
}

function limitFor(nftId: string, editionId: string) {
  const nft = db.nfts[nftId]
  const edition = nft?.editions.find((candidate) => candidate.id === editionId)
  if (!nft || !edition) throw new MockHttpError('NOT_FOUND', 'NFT or edition not found.', undefined, { reason: 'nftOrEdition' })
  return { edition, limit: Math.min(edition.available, edition.maxPerOrder) }
}

export function addItem(cart: CartRecord, nftId: string, editionId: string, quantity: number) {
  const { edition, limit } = limitFor(nftId, editionId)
  if (limit === 0) throw new MockHttpError('AVAILABILITY_CONFLICT', 'Edition is sold out.', undefined, { reason: 'soldOut' })
  const existing = cart.lines.find((line) => line.nftId === nftId && line.editionId === editionId)
  const next = (existing?.quantity ?? 0) + quantity
  if (next > limit) {
    throw new MockHttpError('AVAILABILITY_CONFLICT', `Quantity exceeds the limit of ${limit} for this edition.`, { quantity: validation('quantityAboveLimit') }, { reason: 'limit', limit })
  }
  if (existing) existing.quantity = next
  else cart.lines.push({ id: nextId('line'), nftId, editionId, quantity, priceWhenAdded: edition.price })
  touch(cart)
}

export function setQuantity(cart: CartRecord, lineId: string, quantity: number) {
  const line = cart.lines.find((candidate) => candidate.id === lineId)
  if (!line) throw new MockHttpError('NOT_FOUND', 'Cart item not found.', undefined, { reason: 'cartItem' })
  const { limit } = limitFor(line.nftId, line.editionId)
  if (quantity > limit) {
    throw new MockHttpError('AVAILABILITY_CONFLICT', `Quantity exceeds the limit of ${limit} for this edition.`, { quantity: validation('quantityAboveLimit') }, { reason: 'limit', limit })
  }
  line.quantity = quantity
  touch(cart)
}

export function removeLine(cart: CartRecord, lineId: string) {
  const before = cart.lines.length
  cart.lines = cart.lines.filter((line) => line.id !== lineId)
  if (cart.lines.length === before) throw new MockHttpError('NOT_FOUND', 'Cart item not found.', undefined, { reason: 'cartItem' })
  touch(cart)
}

export function acknowledgePrices(cart: CartRecord) {
  for (const line of cart.lines) {
    const edition = db.nfts[line.nftId]?.editions.find((candidate) => candidate.id === line.editionId)
    if (edition) line.priceWhenAdded = edition.price
  }
  touch(cart)
}

export function mergeGuestCart(user: UserRecord, guestId: string) {
  const guestKey = `guest:${guestId}`
  const guest = db.carts[guestKey]
  if (!guest?.lines.length) return
  const target = getOrCreateCart(`user:${user.id}`)
  for (const line of guest.lines) {
    const { limit } = limitFor(line.nftId, line.editionId)
    const existing = target.lines.find((candidate) => candidate.nftId === line.nftId && candidate.editionId === line.editionId)
    if (existing) existing.quantity = Math.min(existing.quantity + line.quantity, limit)
    else if (limit > 0) target.lines.push({ ...line, id: nextId('line'), quantity: Math.min(line.quantity, limit) })
  }
  target.couponCode ??= guest.couponCode
  delete db.carts[guestKey]
  touch(target)
}

export function applyCoupon(cart: CartRecord, code: string) {
  const normalized = code.trim().toUpperCase()
  const coupon = COUPONS[normalized as keyof typeof COUPONS]
  if (!coupon) throw new MockHttpError('COUPON_INVALID', 'Coupon is invalid.', { code: validation('couponInvalid') })
  if (Date.parse(coupon.expiresAt) < Date.now()) throw new MockHttpError('COUPON_EXPIRED', 'Coupon has expired.', { code: validation('couponExpired') })
  cart.couponCode = normalized
  touch(cart)
}

export function removeCoupon(cart: CartRecord) {
  cart.couponCode = null
  touch(cart)
}

function fingerprint(parts: unknown) {
  const text = JSON.stringify(parts)
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0
  return (hash >>> 0).toString(36)
}

export function computeQuote(cart: CartRecord, network: Network): Quote {
  const lines = cart.lines.map(viewLine).filter((line): line is CartLine => line !== null)
  const issues: QuoteIssue[] = []
  for (const line of lines) {
    const details = { name: line.name, edition: line.editionLabel, available: line.available, previousPrice: line.priceWhenAdded, price: line.unitPrice }
    if (line.available === 0) issues.push({ lineId: line.id, kind: 'sold-out', message: `${line.name} (${line.editionLabel}) is sold out.`, details })
    else if (line.quantity > line.available) {
      issues.push({ lineId: line.id, kind: 'insufficient', message: `Only ${line.available} unit(s) of ${line.name} (${line.editionLabel}) left.`, details })
    }
    if (line.unitPrice !== line.priceWhenAdded) {
      issues.push({ lineId: line.id, kind: 'price-changed', message: `Price of ${line.name} changed from ${line.priceWhenAdded} to ${line.unitPrice} ETH.`, details })
    }
  }

  const quoteLines = lines.map((line) => ({
    id: line.id,
    nftId: line.nftId,
    editionId: line.editionId,
    name: line.name,
    tokenId: line.tokenId,
    artwork: line.artwork,
    editionLabel: line.editionLabel,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    lineTotal: mulEth(line.unitPrice, line.quantity),
  }))

  const subtotal = addEth('0', ...quoteLines.map((line) => line.lineTotal))
  const couponDef = cart.couponCode ? COUPONS[cart.couponCode as keyof typeof COUPONS] : undefined
  const couponExpired = couponDef ? Date.parse(couponDef.expiresAt) < Date.now() : false
  const discount = couponDef && !couponExpired ? percentOfEth(subtotal, couponDef.percentOff * 100) : '0.00'
  const networkFee = lines.length ? NETWORK_FEES[network] : '0.00'
  const total = lines.length ? addEth(subEth(subtotal, discount), networkFee) : '0.00'

  const blocking = issues.some((issue) => issue.kind !== 'price-changed')
  const createdAt = Date.now()
  const version = fingerprint({
    network,
    coupon: couponDef && !couponExpired ? cart.couponCode : null,
    lines: quoteLines.map((line) => [line.id, line.editionId, line.quantity, line.unitPrice]),
    fee: networkFee,
    blocking,
  })

  return {
    id: nextId('quote'),
    version,
    network,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + QUOTE_TTL_MS).toISOString(),
    lines: quoteLines,
    subtotal,
    discount,
    networkFee,
    total: fromWei(toWei(total)),
    coupon: cart.couponCode
      ? {
          code: cart.couponCode,
          status: couponExpired ? 'expired' : 'applied',
          percentOff: couponDef?.percentOff ?? 0,
          message: couponExpired ? 'Coupon has expired.' : `${couponDef?.percentOff}% discount applied.`,
        }
      : null,
    issues,
    purchasable: lines.length > 0 && !blocking,
  }
}

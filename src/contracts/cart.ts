import { z } from 'zod'
import { ethAmount, network } from './common'
import { validation } from '@/i18n/keys'
import { artwork } from './nft'

export const cartLine = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  artwork,
  editionLabel: z.string(),
  quantity: z.number().int().positive(),
  unitPrice: ethAmount,
  priceWhenAdded: ethAmount,
  available: z.number().int().nonnegative(),
  maxPerOrder: z.number().int().positive(),
})
export type CartLine = z.infer<typeof cartLine>

export const cart = z.object({
  id: z.string(),
  owner: z.enum(['guest', 'user']),
  lines: z.array(cartLine),
  couponCode: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
})
export type Cart = z.infer<typeof cart>

export const addCartItemInput = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})
export type AddCartItemInput = z.infer<typeof addCartItemInput>

export const updateCartItemInput = z.object({ quantity: z.number().int().positive() })
export const applyCouponInput = z.object({ code: z.string().trim().min(1, validation('couponRequired')).max(24) })
export const mergeCartInput = z.object({ guestId: z.string() })

export const quoteRequest = z.object({ network: network.default('ethereum') })
export type QuoteRequest = z.input<typeof quoteRequest>

export const quoteIssue = z.object({
  lineId: z.string(),
  kind: z.enum(['price-changed', 'insufficient', 'sold-out']),
  message: z.string(),
  details: z.object({ name: z.string(), edition: z.string(), available: z.number().int().nonnegative(), previousPrice: ethAmount, price: ethAmount }),
})
export type QuoteIssue = z.infer<typeof quoteIssue>

export const quoteLine = cartLine.pick({
  id: true,
  nftId: true,
  editionId: true,
  name: true,
  tokenId: true,
  artwork: true,
  editionLabel: true,
  quantity: true,
  unitPrice: true,
}).extend({ lineTotal: ethAmount })
export type QuoteLine = z.infer<typeof quoteLine>

export const quote = z.object({
  id: z.string(),
  version: z.string(),
  network,
  createdAt: z.string(),
  expiresAt: z.string(),
  lines: z.array(quoteLine),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  coupon: z
    .object({ code: z.string(), status: z.enum(['applied', 'invalid', 'expired']), percentOff: z.number(), message: z.string() })
    .nullable(),
  issues: z.array(quoteIssue),
  purchasable: z.boolean(),
})
export type Quote = z.infer<typeof quote>

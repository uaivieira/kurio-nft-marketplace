import { z } from 'zod'
import { ethAmount, isoDate, network, walletProvider } from './common'
import { quoteLine } from './cart'

export const ORDER_STATUSES = ['pending', 'confirmed', 'rejected'] as const
export const orderStatus = z.enum(ORDER_STATUSES)
export type OrderStatus = z.infer<typeof orderStatus>

export const buyerInfo = z.object({
  displayName: z.string(),
  username: z.string(),
  profileName: z.string(),
  email: z.string(),
  referralCode: z.string(),
  ensName: z.string(),
  note: z.string().max(500).optional(),
})
export type BuyerInfo = z.infer<typeof buyerInfo>

export const createOrderInput = z.object({
  quoteId: z.string(),
  quoteVersion: z.string(),
  walletId: z.string(),
  connectionId: z.string(),
  network,
  buyer: buyerInfo,
})
export type CreateOrderInput = z.infer<typeof createOrderInput>

export const order = z.object({
  id: z.string(),
  status: orderStatus,
  version: z.number().int(),
  createdAt: isoDate,
  updatedAt: isoDate,
  network,
  wallet: z.object({ id: z.string(), nickname: z.string(), provider: walletProvider, address: z.string() }),
  lines: z.array(quoteLine),
  subtotal: ethAmount,
  discount: ethAmount,
  networkFee: ethAmount,
  total: ethAmount,
  couponCode: z.string().nullable(),
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  failureReason: z.string().nullable(),
})
export type Order = z.infer<typeof order>

export const orderList = z.object({ items: z.array(order) })

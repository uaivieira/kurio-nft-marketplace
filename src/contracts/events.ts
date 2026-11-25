import { z } from 'zod'
import { ethAmount } from './common'
import { orderStatus } from './order'

const envelope = {
  eventId: z.string(),
  version: z.number().int().nonnegative(),
  occurredAt: z.string(),
}

export const nftUpdatedEvent = z.object({
  ...envelope,
  type: z.literal('nft.updated'),
  resource: z.object({ kind: z.literal('nft'), id: z.string() }),
  data: z.object({
    nftId: z.string(),
    price: ethAmount,
    totalAvailable: z.number().int().nonnegative(),
    editions: z.array(z.object({ id: z.string(), price: ethAmount, available: z.number().int().nonnegative() })),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEvent>

export const orderUpdatedEvent = z.object({
  ...envelope,
  type: z.literal('order.updated'),
  resource: z.object({ kind: z.literal('order'), id: z.string() }),
  userId: z.string(),
  data: z.object({ orderId: z.string(), status: orderStatus, failureReason: z.string().nullable() }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEvent>

export const realtimeEvent = z.discriminatedUnion('type', [nftUpdatedEvent, orderUpdatedEvent])
export type RealtimeEvent = z.infer<typeof realtimeEvent>

/** Engine path of the Socket.IO endpoint, shared by the client and the simulated server. */
export const SOCKET_PATH = '/realtime/'

/** Socket.IO channel names. */
export const SOCKET_EVENTS = { nftUpdated: 'nft.updated', orderUpdated: 'order.updated' } as const

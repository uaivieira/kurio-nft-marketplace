import { http } from 'msw'
import { createOrderInput } from '@/contracts/order'
import { secondaryWalletInput, walletConnectionInput, walletFields } from '@/contracts/wallet'
import { createOrder, getOrderFor, listOrdersFor } from '../domain/orders'
import { connectWallet, disconnectWallet, getWallets, savePrimary, saveSecondary } from '../domain/wallets'
import { MockHttpError, requireUser, route } from '../http'

export const accountHandlers = [
  http.get('/api/me/wallets', route({ auth: true }, (ctx) => getWallets(requireUser(ctx)))),

  http.put('/api/me/wallets/primary', route({ auth: true }, async (ctx) => savePrimary(requireUser(ctx), await ctx.body(walletFields)))),

  http.put('/api/me/wallets/secondary', route({ auth: true }, async (ctx) => saveSecondary(requireUser(ctx), await ctx.body(secondaryWalletInput)))),

  http.post('/api/wallets/connections', route({ auth: true, tag: 'wallet-connect' }, async (ctx) => connectWallet(requireUser(ctx), await ctx.body(walletConnectionInput)), 201)),

  http.delete('/api/wallets/connections/:id', route<{ id: string }>({ auth: true }, (ctx) => {
    disconnectWallet(requireUser(ctx), ctx.params.id)
    return undefined
  })),

  http.post('/api/orders', route({ auth: true, tag: 'order-create' }, async (ctx) => {
    const key = ctx.request.headers.get('idempotency-key')
    if (!key) throw new MockHttpError('VALIDATION', 'Idempotency-Key header is required.', undefined, { reason: 'idempotencyKeyRequired' })
    const { order } = createOrder(requireUser(ctx), key, await ctx.body(createOrderInput))
    return order
  }, 202)),

  http.get('/api/orders', route({ auth: true }, (ctx) => ({ items: listOrdersFor(requireUser(ctx), ctx.url.searchParams.get('status') ?? undefined) }))),

  http.get('/api/orders/:id', route<{ id: string }>({ auth: true }, (ctx) => getOrderFor(requireUser(ctx), ctx.params.id))),
]

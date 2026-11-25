import { http } from 'msw'
import { addCartItemInput, applyCouponInput, quoteRequest, updateCartItemInput } from '@/contracts/cart'
import { acknowledgePrices, addItem, applyCoupon, cartKey, computeQuote, getOrCreateCart, removeCoupon, removeLine, setQuantity, viewCart } from '../domain/cart'
import { route, type RouteContext } from '../http'
import type { PathParams } from 'msw'

const scope = <P extends PathParams>(ctx: RouteContext<P>) => {
  const key = cartKey(ctx.user, ctx.guestId)
  return { cart: getOrCreateCart(key), owner: ctx.user ? ('user' as const) : ('guest' as const) }
}

export const cartHandlers = [
  http.get('/api/cart', route({}, (ctx) => {
    const { cart, owner } = scope(ctx)
    return viewCart(cart, owner)
  })),

  http.post('/api/cart/items', route({}, async (ctx) => {
    const input = await ctx.body(addCartItemInput)
    const { cart, owner } = scope(ctx)
    addItem(cart, input.nftId, input.editionId, input.quantity)
    return viewCart(cart, owner)
  }, 201)),

  http.patch('/api/cart/items/:lineId', route<{ lineId: string }>({}, async (ctx) => {
    const { quantity } = await ctx.body(updateCartItemInput)
    const { cart, owner } = scope(ctx)
    setQuantity(cart, ctx.params.lineId, quantity)
    return viewCart(cart, owner)
  })),

  http.delete('/api/cart/items/:lineId', route<{ lineId: string }>({}, (ctx) => {
    const { cart, owner } = scope(ctx)
    removeLine(cart, ctx.params.lineId)
    return viewCart(cart, owner)
  })),

  http.post('/api/cart/acknowledge', route({}, (ctx) => {
    const { cart, owner } = scope(ctx)
    acknowledgePrices(cart)
    return viewCart(cart, owner)
  })),

  http.put('/api/cart/coupon', route({}, async (ctx) => {
    const { code } = await ctx.body(applyCouponInput)
    const { cart, owner } = scope(ctx)
    applyCoupon(cart, code)
    return viewCart(cart, owner)
  })),

  http.delete('/api/cart/coupon', route({}, (ctx) => {
    const { cart, owner } = scope(ctx)
    removeCoupon(cart)
    return viewCart(cart, owner)
  })),

  http.post('/api/quotes', route({}, async (ctx) => {
    const { network } = await ctx.body(quoteRequest)
    return computeQuote(scope(ctx).cart, network)
  })),
]

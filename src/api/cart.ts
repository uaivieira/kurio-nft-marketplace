import { cart, quote, type AddCartItemInput, type QuoteRequest } from '@/contracts/cart'
import { http } from '@/lib/http'

export const fetchCart = async (signal?: AbortSignal) => cart.parse((await http.get('/cart', { signal })).data)
export const addCartItem = async (input: AddCartItemInput) => cart.parse((await http.post('/cart/items', input)).data)
export const setCartQuantity = async (lineId: string, quantity: number) =>
  cart.parse((await http.patch(`/cart/items/${encodeURIComponent(lineId)}`, { quantity })).data)
export const removeCartLine = async (lineId: string) => cart.parse((await http.delete(`/cart/items/${encodeURIComponent(lineId)}`)).data)
export const acknowledgePrices = async () => cart.parse((await http.post('/cart/acknowledge')).data)
export const applyCoupon = async (code: string) => cart.parse((await http.put('/cart/coupon', { code })).data)
export const removeCoupon = async () => cart.parse((await http.delete('/cart/coupon')).data)
export const fetchQuote = async (input: QuoteRequest, signal?: AbortSignal) => quote.parse((await http.post('/quotes', input, { signal })).data)

import { order, orderList, type CreateOrderInput } from '@/contracts/order'
import { walletConnection, walletsState, type SecondaryWalletInput, type WalletConnectionInput, type WalletInput } from '@/contracts/wallet'
import { http } from '@/lib/http'

export const createOrder = async (input: CreateOrderInput, idempotencyKey: string) =>
  order.parse((await http.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } })).data)

export const fetchOrder = async (id: string, signal?: AbortSignal) => order.parse((await http.get(`/orders/${encodeURIComponent(id)}`, { signal })).data)
export const fetchPendingOrders = async (signal?: AbortSignal) => orderList.parse((await http.get('/orders', { params: { status: 'pending' }, signal })).data).items

export const fetchWallets = async (signal?: AbortSignal) => walletsState.parse((await http.get('/me/wallets', { signal })).data)
export const savePrimaryWallet = async (input: WalletInput) => walletsState.parse((await http.put('/me/wallets/primary', input)).data)
export const saveSecondaryWallet = async (input: SecondaryWalletInput) => walletsState.parse((await http.put('/me/wallets/secondary', input)).data)

export const connectWallet = async (input: WalletConnectionInput) => walletConnection.parse((await http.post('/wallets/connections', input)).data)
export const disconnectWallet = async (connectionId: string) => {
  await http.delete(`/wallets/connections/${encodeURIComponent(connectionId)}`)
}

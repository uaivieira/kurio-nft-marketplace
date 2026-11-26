import { z } from 'zod'
import { validation } from '@/i18n/keys'
import { isEthString } from '@/lib/eth'

export const ethAmount = z.string().refine(isEthString, validation('ethInvalid'))
export const isoDate = z.string().datetime({ offset: true })

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export const network = z.enum(NETWORKS)
export type Network = z.infer<typeof network>
export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const WALLET_PROVIDERS = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProvider = z.enum(WALLET_PROVIDERS)
export type WalletProvider = z.infer<typeof walletProvider>
export const WALLET_PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

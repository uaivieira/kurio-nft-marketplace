import { z } from 'zod'
import { isoDate, network, walletProvider } from './common'
import { ENS_LABEL_RULE, ENS_SUFFIXES } from './profile'

export const EVM_ADDRESS_RULE = /^0x[a-fA-F0-9]{40}$/
export const REFERRAL_RULE = /^[A-Z0-9]{4,12}$/

export const walletFields = z.object({
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40, 'Máximo de 40 caracteres'),
  nickname: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(30, 'Máximo de 30 caracteres'),
  network,
  profileName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40, 'Máximo de 40 caracteres'),
  address: z.string().trim().regex(EVM_ADDRESS_RULE, 'Endereço deve começar com 0x seguido de 40 caracteres hexadecimais'),
  secondaryAddress: z
    .string()
    .trim()
    .refine((v) => v === '' || EVM_ADDRESS_RULE.test(v) || /^[a-z0-9-]{3,32}\.(eth|xyz|art)$/.test(v), 'Informe um endereço 0x ou nome ENS válido'),
  provider: walletProvider,
  referralCode: z.string().trim().toUpperCase().pipe(z.string().regex(REFERRAL_RULE, 'Use 4 a 12 letras maiúsculas ou números')),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  ensLabel: z.string().trim().regex(ENS_LABEL_RULE, 'Use 3 a 32 caracteres: letras minúsculas, números ou -'),
  ensSuffix: z.enum(ENS_SUFFIXES),
})
export type WalletInput = z.infer<typeof walletFields>

export const wallet = walletFields.extend({
  id: z.string(),
  slot: z.enum(['primary', 'secondary']),
  updatedAt: isoDate,
})
export type Wallet = z.infer<typeof wallet>

export const walletsState = z.object({
  primary: wallet.nullable(),
  secondary: wallet.nullable(),
  secondarySameAsPrimary: z.boolean(),
})
export type WalletsState = z.infer<typeof walletsState>

export const secondaryWalletInput = z.discriminatedUnion('sameAsPrimary', [
  z.object({ sameAsPrimary: z.literal(true) }),
  /** `wallet: null` only clears the "same as primary" flag. */
  z.object({ sameAsPrimary: z.literal(false), wallet: walletFields.nullable() }),
])
export type SecondaryWalletInput = z.infer<typeof secondaryWalletInput>

/** Simulated wallet connection used by checkout (connect / refuse / disconnect). */
export const walletConnectionInput = z.object({
  walletId: z.string(),
  provider: walletProvider,
  network,
})
export type WalletConnectionInput = z.infer<typeof walletConnectionInput>

export const walletConnection = z.object({
  id: z.string(),
  walletId: z.string(),
  provider: walletProvider,
  network,
  address: z.string(),
  connectedAt: isoDate,
})
export type WalletConnection = z.infer<typeof walletConnection>

import { z } from 'zod'
import { isoDate, network, walletProvider } from './common'
import { validation } from '@/i18n/keys'
import { ENS_LABEL_RULE, ENS_SUFFIXES } from './profile'

export const EVM_ADDRESS_RULE = /^0x[a-fA-F0-9]{40}$/
export const REFERRAL_RULE = /^[A-Z0-9]{4,12}$/

export const walletFields = z.object({
  displayName: z.string().trim().min(2, validation('minLength2')).max(40, validation('maxLength40')),
  nickname: z.string().trim().min(2, validation('minLength2')).max(30, validation('maxLength30')),
  network,
  profileName: z.string().trim().min(2, validation('minLength2')).max(40, validation('maxLength40')),
  address: z.string().trim().regex(EVM_ADDRESS_RULE, validation('addressRule')),
  secondaryAddress: z
    .string()
    .trim()
    .refine((v) => v === '' || EVM_ADDRESS_RULE.test(v) || /^[a-z0-9-]{3,32}\.(eth|xyz|art)$/.test(v), validation('secondaryAddressRule')),
  provider: walletProvider,
  referralCode: z.string().trim().toUpperCase().pipe(z.string().regex(REFERRAL_RULE, validation('referralRule'))),
  email: z.string().trim().min(1, validation('emailRequired')).email(validation('emailInvalid')),
  ensLabel: z.string().trim().regex(ENS_LABEL_RULE, validation('ensLabelRule')),
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
  z.object({ sameAsPrimary: z.literal(false), wallet: walletFields.nullable() }),
])
export type SecondaryWalletInput = z.infer<typeof secondaryWalletInput>

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

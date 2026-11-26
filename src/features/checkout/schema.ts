import { z } from 'zod'
import { USERNAME_RULE } from '@/contracts/auth'
import { network } from '@/contracts/common'
import { ENS_LABEL_RULE, ENS_SUFFIXES } from '@/contracts/profile'
import { REFERRAL_RULE } from '@/contracts/wallet'
import { validation } from '@/i18n/keys'

export const checkoutSchema = z.object({
  displayName: z.string().trim().min(2, validation('minLength2')).max(40, validation('maxLength40')),
  username: z.string().trim().regex(USERNAME_RULE, validation('usernameRule')),
  profileName: z.string().trim().min(2, validation('minLength2')).max(40, validation('maxLength40')),
  email: z.string().trim().min(1, validation('emailRequired')).email(validation('emailInvalid')),
  referralCode: z.string().trim().toUpperCase().pipe(z.string().regex(REFERRAL_RULE, validation('referralRule'))),
  ensLabel: z.string().trim().regex(ENS_LABEL_RULE, validation('ensLabelRule')),
  ensSuffix: z.enum(ENS_SUFFIXES),
  note: z.string().trim().max(500, validation('maxLength500')).optional(),
  network,
})
export type CheckoutValues = z.input<typeof checkoutSchema>

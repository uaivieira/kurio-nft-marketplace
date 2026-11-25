import { z } from 'zod'
import { USERNAME_RULE } from '@/contracts/auth'
import { network } from '@/contracts/common'
import { ENS_LABEL_RULE, ENS_SUFFIXES } from '@/contracts/profile'
import { REFERRAL_RULE } from '@/contracts/wallet'

export const checkoutSchema = z.object({
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40, 'Máximo de 40 caracteres'),
  username: z.string().trim().regex(USERNAME_RULE, 'Use 3 a 20 caracteres: letras minúsculas, números ou _'),
  profileName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40, 'Máximo de 40 caracteres'),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  referralCode: z.string().trim().toUpperCase().pipe(z.string().regex(REFERRAL_RULE, 'Use 4 a 12 letras maiúsculas ou números')),
  ensLabel: z.string().trim().regex(ENS_LABEL_RULE, 'Use 3 a 32 caracteres: letras minúsculas, números ou -'),
  ensSuffix: z.enum(ENS_SUFFIXES),
  note: z.string().trim().max(500, 'Máximo de 500 caracteres').optional(),
  network,
})
export type CheckoutValues = z.input<typeof checkoutSchema>

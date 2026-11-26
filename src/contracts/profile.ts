import { z } from 'zod'
import { PASSWORD_RULE, USERNAME_RULE } from './auth'
import { validation } from '@/i18n/keys'
import { isoDate } from './common'

export const ENS_SUFFIXES = ['.eth', '.xyz', '.art'] as const
export const ENS_LABEL_RULE = /^[a-z0-9-]{3,32}$/

export const profile = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string(),
  ensLabel: z.string(),
  ensSuffix: z.enum(ENS_SUFFIXES),
  walletNickname: z.string(),
  avatarUrl: z.string().nullable(),
  updatedAt: isoDate,
})
export type Profile = z.infer<typeof profile>

export const profileInput = z.object({
  displayName: z.string().trim().min(2, validation('minLength2')).max(40, validation('maxLength40')),
  username: z.string().trim().regex(USERNAME_RULE, validation('usernameRule')),
  email: z.string().trim().min(1, validation('emailRequired')).email(validation('emailInvalid')),
  ensLabel: z.string().trim().regex(ENS_LABEL_RULE, validation('ensLabelRule')),
  ensSuffix: z.enum(ENS_SUFFIXES),
  walletNickname: z.string().trim().min(2, validation('minLength2')).max(30, validation('maxLength30')),
})
export type ProfileInput = z.infer<typeof profileInput>

export const MAX_AVATAR_BYTES = 1_000_000
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const avatarInput = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, validation('avatarFormat')).nullable(),
})
export type AvatarInput = z.infer<typeof avatarInput>

export const passwordInput = z
  .object({
    currentPassword: z.string().min(1, validation('currentPasswordRequired')),
    newPassword: z.string().regex(PASSWORD_RULE, validation('passwordRule')),
    confirmPassword: z.string().min(1, validation('newPasswordConfirmRequired')),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: validation('passwordsMismatch'),
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: validation('newPasswordSameAsCurrent'),
  })
export type PasswordInput = z.infer<typeof passwordInput>

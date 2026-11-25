import { z } from 'zod'
import { PASSWORD_RULE, USERNAME_RULE } from './auth'
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
  displayName: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(40, 'Máximo de 40 caracteres'),
  username: z.string().trim().regex(USERNAME_RULE, 'Use 3 a 20 caracteres: letras minúsculas, números ou _'),
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  ensLabel: z.string().trim().regex(ENS_LABEL_RULE, 'Use 3 a 32 caracteres: letras minúsculas, números ou -'),
  ensSuffix: z.enum(ENS_SUFFIXES),
  walletNickname: z.string().trim().min(2, 'Mínimo de 2 caracteres').max(30, 'Máximo de 30 caracteres'),
})
export type ProfileInput = z.infer<typeof profileInput>

export const MAX_AVATAR_BYTES = 1_000_000
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const avatarInput = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/, 'Formato de imagem não suportado').nullable(),
})
export type AvatarInput = z.infer<typeof avatarInput>

export const passwordInput = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: z.string().regex(PASSWORD_RULE, 'Mínimo de 8 caracteres, com letras e números'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha deve ser diferente da atual',
  })
export type PasswordInput = z.infer<typeof passwordInput>

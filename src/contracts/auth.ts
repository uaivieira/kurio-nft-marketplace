import { z } from 'zod'
import { validation } from '@/i18n/keys'
import { isoDate } from './common'

export const user = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof user>

export const session = z.object({
  token: z.string(),
  expiresAt: isoDate,
  user,
})
export type Session = z.infer<typeof session>

export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/
export const USERNAME_RULE = /^[a-z0-9_]{3,20}$/

export const loginInput = z.object({
  email: z.string().trim().min(1, validation('emailRequired')).email(validation('emailInvalid')),
  password: z.string().min(1, validation('passwordRequired')),
})
export type LoginInput = z.infer<typeof loginInput>

export const signupInput = z
  .object({
    username: z
      .string()
      .trim()
      .regex(USERNAME_RULE, validation('usernameRule')),
    email: z.string().trim().min(1, validation('emailRequired')).email(validation('emailInvalid')),
    password: z.string().regex(PASSWORD_RULE, validation('passwordRule')),
    confirmPassword: z.string().min(1, validation('confirmPasswordRequired')),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: validation('passwordsMismatch'),
  })
export type SignupInput = z.infer<typeof signupInput>

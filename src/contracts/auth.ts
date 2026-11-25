import { z } from 'zod'
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
  email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginInput = z.infer<typeof loginInput>

export const signupInput = z
  .object({
    username: z
      .string()
      .trim()
      .regex(USERNAME_RULE, 'Use 3 a 20 caracteres: letras minúsculas, números ou _'),
    email: z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido'),
    password: z.string().regex(PASSWORD_RULE, 'Mínimo de 8 caracteres, com letras e números'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não coincidem',
  })
export type SignupInput = z.infer<typeof signupInput>

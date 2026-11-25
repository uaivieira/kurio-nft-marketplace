import { http } from 'msw'
import { loginInput, signupInput } from '@/contracts/auth'
import { avatarInput, MAX_AVATAR_BYTES, passwordInput, profileInput } from '@/contracts/profile'
import { z } from 'zod'
import { changePassword, login, logout, sessionFor, setAvatar, signup, toProfile, toUser, updateProfile } from '../domain/auth'
import { mergeGuestCart } from '../domain/cart'
import { MockHttpError, requireUser, route } from '../http'
import { db } from '../db/state'

const loginBody = loginInput.extend({ guestId: z.string().optional() })
const signupBody = signupInput.and(z.object({ guestId: z.string().optional() }))

export const authHandlers = [
  http.post('/api/auth/signup', route({}, async (ctx) => {
    const { guestId, ...input } = await ctx.body(signupBody)
    const session = await signup(input)
    if (guestId) mergeGuestCart(db.users[session.user.id]!, guestId)
    return session
  }, 201)),

  http.post('/api/auth/login', route({}, async (ctx) => {
    const { guestId, ...input } = await ctx.body(loginBody)
    const session = await login(input.email, input.password)
    if (guestId) mergeGuestCart(db.users[session.user.id]!, guestId)
    return session
  })),

  http.get('/api/auth/session', route({ auth: true }, (ctx) => sessionFor(ctx.token!, requireUser(ctx)))),

  http.post('/api/auth/logout', route({}, (ctx) => {
    logout(ctx.token)
    return undefined
  })),

  http.get('/api/me/profile', route({ auth: true }, (ctx) => toProfile(requireUser(ctx)))),

  http.patch('/api/me/profile', route({ auth: true }, async (ctx) => {
    const user = requireUser(ctx)
    const profile = updateProfile(user, await ctx.body(profileInput))
    return { profile, user: toUser(user) }
  })),

  http.put('/api/me/avatar', route({ auth: true }, async (ctx) => {
    const { dataUrl } = await ctx.body(avatarInput)
    if (dataUrl && dataUrl.length * 0.75 > MAX_AVATAR_BYTES) {
      throw new MockHttpError('VALIDATION', 'Imagem muito grande.', { avatar: 'A imagem deve ter no máximo 1 MB.' })
    }
    const user = requireUser(ctx)
    const profile = setAvatar(user, dataUrl)
    return { profile, user: toUser(user) }
  })),

  http.post('/api/me/password', route({ auth: true }, async (ctx) => {
    const input = await ctx.body(passwordInput)
    await changePassword(requireUser(ctx), input.currentPassword, input.newPassword)
    return undefined
  })),
]

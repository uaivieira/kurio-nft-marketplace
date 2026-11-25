import { session, user, type LoginInput, type SignupInput } from '@/contracts/auth'
import { avatarInput, profile, type AvatarInput, type PasswordInput, type ProfileInput } from '@/contracts/profile'
import { z } from 'zod'
import { http } from '@/lib/http'
import { getGuestId } from '@/lib/session-store'

const profileEnvelope = z.object({ profile, user })

export const login = async (input: LoginInput) =>
  session.parse((await http.post('/auth/login', { ...input, guestId: getGuestId() })).data)

export const signup = async (input: SignupInput) =>
  session.parse((await http.post('/auth/signup', { ...input, guestId: getGuestId() })).data)

export const fetchSession = async (signal?: AbortSignal) => session.parse((await http.get('/auth/session', { signal })).data)
export const logout = async () => {
  await http.post('/auth/logout')
}

export const fetchProfile = async (signal?: AbortSignal) => profile.parse((await http.get('/me/profile', { signal })).data)
export const updateProfile = async (input: ProfileInput) => profileEnvelope.parse((await http.patch('/me/profile', input)).data)
export const updateAvatar = async (input: AvatarInput) => profileEnvelope.parse((await http.put('/me/avatar', avatarInput.parse(input))).data)
export const changePassword = async (input: PasswordInput) => {
  await http.post('/me/password', input)
}

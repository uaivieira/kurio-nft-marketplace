import type { Session, SignupInput, User } from '@/contracts/auth'
import type { Profile, ProfileInput } from '@/contracts/profile'
import { db, hashPassword, nextId, persist, verifyPassword, type UserRecord } from '../db/state'
import { MockHttpError } from '../http'
import { validation } from '@/i18n/keys'

const SESSION_TTL_MS = 8 * 3600_000

export const toUser = (user: UserRecord): User => ({
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
})

export const toProfile = (user: UserRecord): Profile => ({
  id: user.id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  ensLabel: user.ensLabel,
  ensSuffix: user.ensSuffix,
  walletNickname: user.walletNickname,
  avatarUrl: user.avatarUrl,
  updatedAt: user.updatedAt,
})

function startSession(user: UserRecord): Session {
  const token = `kt_${crypto.randomUUID().replace(/-/g, '')}`
  const expiresAt = Date.now() + SESSION_TTL_MS
  db.sessions[token] = { userId: user.id, expiresAt }
  persist()
  return { token, expiresAt: new Date(expiresAt).toISOString(), user: toUser(user) }
}

export function sessionFor(token: string, user: UserRecord): Session {
  const record = db.sessions[token]
  return { token, expiresAt: new Date(record?.expiresAt ?? Date.now()).toISOString(), user: toUser(user) }
}

const findByEmail = (email: string) => Object.values(db.users).find((user) => user.email.toLowerCase() === email.toLowerCase())
const findByUsername = (username: string) => Object.values(db.users).find((user) => user.username === username)

export async function signup(input: SignupInput): Promise<Session> {
  const conflicts: Record<string, string> = {}
  if (findByEmail(input.email)) conflicts.email = validation('emailTaken')
  if (findByUsername(input.username)) conflicts.username = validation('usernameTaken')
  if (Object.keys(conflicts).length) throw new MockHttpError('CONFLICT', 'An account with these details already exists.', conflicts)

  const { salt, hash } = await hashPassword(input.password)
  const user: UserRecord = {
    id: nextId('u'),
    email: input.email,
    username: input.username,
    displayName: input.username,
    ensLabel: input.username,
    ensSuffix: '.eth',
    walletNickname: `Carteira de ${input.username}`,
    avatarUrl: null,
    passwordSalt: salt,
    passwordHash: hash,
    updatedAt: new Date().toISOString(),
  }
  db.users[user.id] = user
  db.favorites[user.id] = []
  db.wallets[user.id] = { primary: null, secondary: null, secondarySameAsPrimary: false }
  return startSession(user)
}

export async function login(email: string, password: string): Promise<Session> {
  const user = findByEmail(email)
  if (!user || !(await verifyPassword(user, password))) {
    throw new MockHttpError('UNAUTHENTICATED', 'Invalid email or password.', undefined, { reason: 'invalidCredentials' })
  }
  return startSession(user)
}

export function logout(token: string | null) {
  if (token) delete db.sessions[token]
  persist()
}

export function updateProfile(user: UserRecord, input: ProfileInput): Profile {
  const conflicts: Record<string, string> = {}
  const emailOwner = findByEmail(input.email)
  if (emailOwner && emailOwner.id !== user.id) conflicts.email = validation('emailTaken')
  const usernameOwner = findByUsername(input.username)
  if (usernameOwner && usernameOwner.id !== user.id) conflicts.username = validation('usernameTaken')
  if (Object.keys(conflicts).length) throw new MockHttpError('CONFLICT', 'An account with these details already exists.', conflicts)

  Object.assign(user, { ...input, updatedAt: new Date().toISOString() })
  persist()
  return toProfile(user)
}

export function setAvatar(user: UserRecord, dataUrl: string | null) {
  user.avatarUrl = dataUrl
  user.updatedAt = new Date().toISOString()
  persist()
  return toProfile(user)
}

export async function changePassword(user: UserRecord, currentPassword: string, newPassword: string) {
  if (!(await verifyPassword(user, currentPassword))) {
    throw new MockHttpError('VALIDATION', 'Current password is incorrect.', { currentPassword: validation('currentPasswordWrong') })
  }
  const { salt, hash } = await hashPassword(newPassword)
  user.passwordSalt = salt
  user.passwordHash = hash
  persist()
}

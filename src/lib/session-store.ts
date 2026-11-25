import { useSyncExternalStore } from 'react'
import type { Session, User } from '@/contracts/auth'

const SESSION_KEY = 'kurio:session'
const GUEST_KEY = 'kurio:guest-id'

type Listener = () => void
const listeners = new Set<Listener>()

function read(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

let current: Session | null = read()

function emit() {
  for (const listener of listeners) listener()
}

export const getSession = () => current
export const getToken = () => current?.token ?? null

export function setSession(session: Session) {
  current = session
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  emit()
}

export function updateSessionUser(user: User) {
  if (!current) return
  setSession({ ...current, user })
}

export function clearSession() {
  current = null
  localStorage.removeItem(SESSION_KEY)
  emit()
}

const subscribe = (listener: Listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useSession = () => useSyncExternalStore(subscribe, getSession, getSession)

const EXPIRED_KEY = 'kurio:session-expired'

/** Remembers that the last session ended by expiry (not logout), for the next login prompt. */
export function markSessionExpired() {
  sessionStorage.setItem(EXPIRED_KEY, '1')
}

/** Reads and clears the expiry mark. */
export function consumeSessionExpired() {
  const expired = sessionStorage.getItem(EXPIRED_KEY) === '1'
  sessionStorage.removeItem(EXPIRED_KEY)
  return expired
}

/** Identifies the visitor's cart before authentication. */
export function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_KEY, id)
  }
  return id
}

/** Scope segment used in private query keys, so caches never leak across users. */
export const scopeOf = (session: Session | null) => session?.user.id ?? 'guest'

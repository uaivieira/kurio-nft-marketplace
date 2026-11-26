import { redirect } from '@tanstack/react-router'
import { consumeSessionExpired, getSession } from './session-store'

const BASE = 'http://kurio.invalid'

const isControlCharacter = (character: string) => {
  const code = character.charCodeAt(0)
  return code <= 0x1f || code === 0x7f
}

export function safeRedirect(target: string | undefined) {
  if (!target || !target.startsWith('/') || /[\\\s]/.test(target) || [...target].some(isControlCharacter)) return '/'
  try {
    return new URL(target, BASE).origin === BASE ? target : '/'
  } catch {
    return '/'
  }
}

export function requireAuth(location: { href: string }) {
  if (getSession()) return
  throw redirect({ to: '/login', search: { redirect: location.href, ...(consumeSessionExpired() ? { reason: 'expired' as const } : {}) } })
}

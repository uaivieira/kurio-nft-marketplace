import { redirect } from '@tanstack/react-router'
import { consumeSessionExpired, getSession } from './session-store'

/** Only same-origin relative paths are accepted as post-login destinations. */
export function safeRedirect(target: string | undefined) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

/**
 * Guards private routes. If the session was dropped because it expired (possibly detected by a
 * background request on a previous page), the login prompt still says so.
 */
export function requireAuth(location: { href: string }) {
  if (getSession()) return
  throw redirect({ to: '/login', search: { redirect: location.href, ...(consumeSessionExpired() ? { reason: 'expired' as const } : {}) } })
}

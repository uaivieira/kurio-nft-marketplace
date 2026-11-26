import { redirect } from '@tanstack/react-router'
import { consumeSessionExpired, getSession } from './session-store'

/** Placeholder origin: a target that resolves anywhere else would leave the site. */
const BASE = 'http://kurio.invalid'

/**
 * Only same-origin paths are accepted as post-login destinations. Browsers treat `\` as `/` and drop
 * tabs and newlines while parsing URLs, so `/\evil` or `/<tab>/evil` would become `//evil`
 * (another host); those characters are rejected outright, and the result must resolve to this origin.
 */
export function safeRedirect(target: string | undefined) {
  // oxlint-disable-next-line no-control-regex -- control characters are exactly what must be rejected
  if (!target || !target.startsWith('/') || /[\\\s\u0000-\u001f\u007f]/.test(target)) return '/'
  try {
    return new URL(target, BASE).origin === BASE ? target : '/'
  } catch {
    return '/'
  }
}

/**
 * Guards private routes. If the session was dropped because it expired (possibly detected by a
 * background request on a previous page), the login prompt still says so.
 */
export function requireAuth(location: { href: string }) {
  if (getSession()) return
  throw redirect({ to: '/login', search: { redirect: location.href, ...(consumeSessionExpired() ? { reason: 'expired' as const } : {}) } })
}

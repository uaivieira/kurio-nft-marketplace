import { redirect } from '@tanstack/react-router'
import { getSession } from './session-store'

/** Only same-origin relative paths are accepted as post-login destinations. */
export function safeRedirect(target: string | undefined) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}

export function requireAuth(location: { href: string }) {
  if (!getSession()) throw redirect({ to: '/login', search: { redirect: location.href } })
}

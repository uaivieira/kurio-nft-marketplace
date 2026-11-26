import { queryClient } from './query-client'
import { checkoutDraftOwner, clearCheckoutDraft } from './checkout-draft'
import { clearSession, consumeSessionExpired, getSession, markSessionExpired, setSession } from './session-store'
import type { Session } from '@/contracts/auth'
import * as authApi from '@/api/auth'

/**
 * Identity transitions. Every one of them wipes private cache entries so data from a
 * previous user can never render for the next one; the realtime provider reconnects
 * automatically because it is keyed by the session token.
 */
function wipePrivateData() {
  queryClient.removeQueries({ queryKey: ['private'] })
}

export async function startSession(session: Session) {
  const previous = getSession()
  // The draft survives an expiry (no session left), so its owner is checked too: another user
  // logging in on this tab must not inherit the previous user's checkout data.
  const owner = checkoutDraftOwner()
  if ((previous && previous.user.id !== session.user.id) || (owner && owner !== session.user.id)) clearCheckoutDraft()
  consumeSessionExpired()
  wipePrivateData()
  setSession(session)
}

export async function logout() {
  try {
    await authApi.logout()
  } catch {
    /* the local session is dropped regardless of the network outcome */
  }
  clearCheckoutDraft()
  consumeSessionExpired()
  clearSession()
  queryClient.clear()
}

/** Called by the HTTP layer when the API reports SESSION_EXPIRED. The checkout draft is kept. */
export function expireSession() {
  markSessionExpired()
  clearSession()
  queryClient.clear()
}

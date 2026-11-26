import { queryClient } from './query-client'
import { checkoutDraftOwner, clearCheckoutDraft } from './checkout-draft'
import { clearSession, consumeSessionExpired, getSession, markSessionExpired, setSession } from './session-store'
import type { Session } from '@/contracts/auth'
import * as authApi from '@/api/auth'

function wipePrivateData() {
  queryClient.removeQueries({ queryKey: ['private'] })
}

export async function startSession(session: Session) {
  const previous = getSession()
  const owner = checkoutDraftOwner()
  if ((previous && previous.user.id !== session.user.id) || (owner && owner !== session.user.id)) clearCheckoutDraft()
  consumeSessionExpired()
  wipePrivateData()
  setSession(session)
}

export async function logout() {
  await authApi.logout().catch(() => undefined)
  clearCheckoutDraft()
  consumeSessionExpired()
  clearSession()
  queryClient.clear()
}

export function expireSession() {
  markSessionExpired()
  clearSession()
  queryClient.clear()
}

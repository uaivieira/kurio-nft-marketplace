/**
 * Checkout form values survive a session expiry so the user can resume after logging
 * back in. The draft is tagged with its owner and dropped for anyone else.
 */
const DRAFT_KEY = 'kurio:checkout-draft'

export interface CheckoutDraft {
  userId: string
  values: Record<string, unknown>
}

export function saveCheckoutDraft(draft: CheckoutDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

function readDraft(): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as CheckoutDraft) : null
  } catch {
    return null
  }
}

export function loadCheckoutDraft(userId: string): CheckoutDraft | null {
  const draft = readDraft()
  return draft?.userId === userId ? draft : null
}

/** Owner of the stored draft, if any (it may outlive the session that wrote it). */
export const checkoutDraftOwner = () => readDraft()?.userId ?? null

export function clearCheckoutDraft() {
  sessionStorage.removeItem(DRAFT_KEY)
  for (const key of Object.keys(sessionStorage)) if (key.startsWith('kurio:idem:')) sessionStorage.removeItem(key)
}

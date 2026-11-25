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

export function loadCheckoutDraft(userId: string): CheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as CheckoutDraft
    return draft.userId === userId ? draft : null
  } catch {
    return null
  }
}

export function clearCheckoutDraft() {
  sessionStorage.removeItem(DRAFT_KEY)
  for (const key of Object.keys(sessionStorage)) if (key.startsWith('kurio:idem:')) sessionStorage.removeItem(key)
}

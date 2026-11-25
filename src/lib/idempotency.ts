/**
 * One idempotency key per distinct order payload. The key is kept in sessionStorage, so
 * resending after a timeout or a page refresh reuses it and the server returns the
 * same order instead of creating another. A different payload gets a new key.
 */
const PREFIX = 'kurio:idem:'

function hash(text: string) {
  let value = 5381
  for (let i = 0; i < text.length; i += 1) value = (Math.imul(value, 33) ^ text.charCodeAt(i)) | 0
  return (value >>> 0).toString(36)
}

export function idempotencyKeyFor(payload: unknown): string {
  const storageKey = PREFIX + hash(JSON.stringify(payload))
  let key = sessionStorage.getItem(storageKey)
  if (!key) {
    key = crypto.randomUUID()
    sessionStorage.setItem(storageKey, key)
  }
  return key
}

export function forgetIdempotencyKey(payload: unknown) {
  sessionStorage.removeItem(PREFIX + hash(JSON.stringify(payload)))
}

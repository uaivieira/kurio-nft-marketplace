import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@/contracts/auth'

class MemoryStorage {
  getItem(key: string) {
    return Object.hasOwn(this, key) ? (this as unknown as Record<string, string>)[key]! : null
  }
  setItem(key: string, value: string) {
    ;(this as unknown as Record<string, string>)[key] = String(value)
  }
  removeItem(key: string) {
    delete (this as unknown as Record<string, string>)[key]
  }
}
vi.stubGlobal('localStorage', new MemoryStorage())
vi.stubGlobal('sessionStorage', new MemoryStorage())

const { startSession, expireSession } = await import('./auth-flow')
const { loadCheckoutDraft, saveCheckoutDraft } = await import('./checkout-draft')
const { clearSession } = await import('./session-store')

const sessionOf = (id: string): Session =>
  ({ token: `token-${id}`, expiresAt: '2099-01-01T00:00:00.000Z', user: { id, username: id, email: `${id}@kurio.test`, displayName: id } }) as unknown as Session

describe('startSession and the checkout draft', () => {
  beforeEach(() => {
    clearSession()
    for (const key of Object.keys(sessionStorage)) sessionStorage.removeItem(key)
  })

  it('keeps the draft when the same user logs back in after expiry', async () => {
    await startSession(sessionOf('ana'))
    saveCheckoutDraft({ userId: 'ana', values: { email: 'ana@kurio.test' } })
    expireSession()
    await startSession(sessionOf('ana'))
    expect(loadCheckoutDraft('ana')?.values).toEqual({ email: 'ana@kurio.test' })
  })

  it('drops another user’s draft and idempotency keys after expiry', async () => {
    await startSession(sessionOf('ana'))
    saveCheckoutDraft({ userId: 'ana', values: { email: 'ana@kurio.test' } })
    sessionStorage.setItem('kurio:idem:abc', 'key')
    expireSession()
    await startSession(sessionOf('bruno'))
    expect(loadCheckoutDraft('ana')).toBeNull()
    expect(sessionStorage.getItem('kurio:checkout-draft')).toBeNull()
    expect(sessionStorage.getItem('kurio:idem:abc')).toBeNull()
  })

  it('drops another user’s draft when there was no session at all', async () => {
    saveCheckoutDraft({ userId: 'ana', values: {} })
    await startSession(sessionOf('bruno'))
    expect(sessionStorage.getItem('kurio:checkout-draft')).toBeNull()
  })
})

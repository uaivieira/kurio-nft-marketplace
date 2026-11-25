import { describe, expect, it } from 'vitest'
import { SEED_PASSWORD, SEED_PASSWORD_HASH } from './seed'

describe('seed credentials', () => {
  it('ships the PBKDF2 hash of the documented demo password', async () => {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SEED_PASSWORD), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode('kurio-seed-salt'), iterations: 60_000 }, key, 256)
    const hex = Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('')
    expect(hex).toBe(SEED_PASSWORD_HASH)
  })
})

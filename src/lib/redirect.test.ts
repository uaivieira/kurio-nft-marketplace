import { describe, expect, it } from 'vitest'
import { safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it('keeps same-origin paths with query and hash', () => {
    expect(safeRedirect('/checkout')).toBe('/checkout')
    expect(safeRedirect('/orders/abc?from=checkout#receipt')).toBe('/orders/abc?from=checkout#receipt')
    expect(safeRedirect('/?q=Golden%20Beat&page=2#catalogo')).toBe('/?q=Golden%20Beat&page=2#catalogo')
  })

  it('falls back to the home without a target', () => {
    expect(safeRedirect(undefined)).toBe('/')
    expect(safeRedirect('')).toBe('/')
  })

  it.each([
    ['protocol-relative', '//evil.example'],
    ['backslash after the slash', '/\\evil.example'],
    ['escaped slash', '/\\/evil.example'],
    ['tab inside the authority', '/\t/evil.example'],
    ['newline inside the authority', '/\n/evil.example'],
    ['leading space', ' /checkout'],
    ['javascript URL', 'javascript:alert(1)'],
    ['absolute URL', 'https://evil.example/checkout'],
    ['relative path', 'checkout'],
  ])('rejects %s', (_, target) => {
    expect(safeRedirect(target)).toBe('/')
  })
})

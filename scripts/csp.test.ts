import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { cspDirective, cspHash, executableInlineScripts, LOADER_SCRIPT, securityHeaders, STALE_CHECK_SCRIPT } from './csp'

const headers = securityHeaders()
const policy = headers['Content-Security-Policy'] ?? ''
const routes = (JSON.parse(readFileSync('vercel.json', 'utf8')) as { routes: Array<Record<string, unknown>> }).routes

describe('vercel.json security headers', () => {
  it('applies them to every response, before the filesystem and the SPA fallback', () => {
    expect(routes[0]).toMatchObject({ src: '/(.*)', continue: true })
    expect(routes.findIndex((route) => route.handle === 'filesystem')).toBeGreaterThan(0)
  })

  it('keeps the immutable cache of hashed assets and fonts', () => {
    expect(routes).toContainEqual({ src: '/(assets|fonts)/(.*)', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true })
  })

  it('answers 404 for a missing asset or font instead of the SPA fallback', () => {
    const filesystem = routes.findIndex((route) => route.handle === 'filesystem')
    const missing = routes.findIndex((route) => route.src === '/(assets|fonts)/(.*)' && route.status === 404)
    expect(missing).toBeGreaterThan(filesystem)
    expect(missing).toBeLessThan(routes.findIndex((route) => route.dest === '/index.html'))
  })

  it('serves the prerendered marketplace and detail pages', () => {
    expect(routes).toContainEqual({ src: '/mercado', dest: '/mercado.html', check: true })
    expect(routes).toContainEqual({ src: '/nft/([a-z0-9-]+)', dest: '/nft/$1.html', check: true })
  })

  it('sets the hardening headers', () => {
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    for (const feature of ['camera', 'microphone', 'geolocation', 'payment', 'usb']) expect(headers['Permissions-Policy']).toContain(`${feature}=()`)
  })

  it('has a restrictive Content-Security-Policy', () => {
    expect(cspDirective(policy, 'default-src')).toEqual(["'self'"])
    expect(cspDirective(policy, 'frame-ancestors')).toEqual(["'none'"])
    expect(cspDirective(policy, 'object-src')).toEqual(["'none'"])
    expect(cspDirective(policy, 'base-uri')).toEqual(["'self'"])
    expect(cspDirective(policy, 'form-action')).toEqual(["'self'"])
    expect(cspDirective(policy, 'connect-src')).toEqual(["'self'"])
    expect(cspDirective(policy, 'img-src')).toEqual(["'self'", 'data:', 'blob:'])
    expect(cspDirective(policy, 'font-src')).toEqual(["'self'"])
    const scripts = cspDirective(policy, 'script-src') ?? []
    expect(scripts).not.toContain("'unsafe-inline'")
    expect(scripts).not.toContain("'unsafe-eval'")
  })

  it('allows the inline scripts the prerender emits', () => {
    const scripts = cspDirective(policy, 'script-src') ?? []
    expect(scripts).toContain(cspHash(STALE_CHECK_SCRIPT))
    expect(scripts).toContain(cspHash(LOADER_SCRIPT))
  })
})

describe('executableInlineScripts', () => {
  it('ignores external and JSON scripts', () => {
    const html = '<script>a()</script><script type="module" crossorigin src="/x.js"></script><script type="application/json" id="s">{}</script><script type="module">b()</script>'
    expect(executableInlineScripts(html)).toEqual(['a()', 'b()'])
  })
})

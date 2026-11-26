import type { Page } from '@playwright/test'
import { securityHeaders } from '../../scripts/csp'
import { addToCart, expect, openReview, test } from './fixtures'

/**
 * `vite preview` does not read vercel.json, so every document response gets the deployed security
 * headers here. A policy too strict for the app (a blocked inline script, style, image, socket or eval)
 * shows up as a `securitypolicyviolation` event or a console error.
 */
const HEADERS = securityHeaders()

async function enforceDeployedHeaders(page: Page) {
  const problems: string[] = []
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback()
    const response = await route.fetch()
    await route.fulfill({ response, headers: { ...response.headers(), ...HEADERS } })
  })
  await page.addInitScript(() => {
    const violations: string[] = ((window as unknown as { __cspViolations: string[] }).__cspViolations = [])
    document.addEventListener('securitypolicyviolation', (event) => {
      violations.push(`${event.effectiveDirective} blocked ${event.blockedURI || 'inline'} (${event.sourceFile}:${event.lineNumber})`)
    })
  })
  page.on('console', (message) => {
    if (/Content Security Policy|Permissions-Policy|Permissions Policy/i.test(message.text())) problems.push(message.text())
  })
  return {
    async expectNoViolations() {
      const violations = await page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations)
      expect([...violations, ...problems]).toEqual([])
    },
  }
}

test.describe('cabeçalhos de segurança do deploy', () => {
  test('a política é aplicada: script inline injetado não executa', async ({ app }) => {
    const { page } = app
    await enforceDeployedHeaders(page)
    await app.open('/')
    const executed = await page.evaluate(() => {
      const script = document.createElement('script')
      script.textContent = 'window.__injected = true'
      document.body.append(script)
      return Boolean((window as unknown as { __injected?: boolean }).__injected)
    })
    expect(executed).toBe(false)
    await expect.poll(() => page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations)).toContainEqual(expect.stringMatching(/^script-src-elem blocked inline/))
  })

  test('início, mercado, detalhe e catálogo filtrado sem violações', async ({ app }) => {
    const { page } = app
    const csp = await enforceDeployedHeaders(page)
    for (const path of ['/', '/mercado', '/nft/emerald-ape-042', '/?q=Golden']) {
      await app.open(path)
      await expect(page.getByTestId('nft-card').or(page.getByRole('heading', { name: 'Emerald Ape #042' })).first()).toBeVisible()
      await page.waitForLoadState('networkidle')
      await csp.expectNoViolations()
    }
  })

  test('login, carrinho e checkout com tempo real sem violações', async ({ app }) => {
    const { page, backend } = app
    const csp = await enforceDeployedHeaders(page)
    await app.login('ana')
    await addToCart(page, 'emerald-ape-042')
    await page.goto('/cart')
    await expect(page.getByTestId('total')).toHaveText('1.206 ETH')
    await csp.expectNoViolations()

    // Realtime: a Socket.IO price event invalidates the quote under review.
    await openReview(page)
    await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)
    await backend.updateEdition('emerald-ape-042', 'e50', { price: '1.40' })
    await expect(page.getByTestId('quote-outdated')).toBeVisible()
    await page.getByRole('button', { name: 'Atualizar valores' }).click()
    await page.getByRole('button', { name: 'Enviar pedido' }).click()
    await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
    await csp.expectNoViolations()
  })
})

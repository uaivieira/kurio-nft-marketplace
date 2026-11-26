import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { addToCart, expect, openReview, test } from './fixtures'

async function seriousViolations(page: Page) {
  await page.waitForLoadState('networkidle')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)
}

for (const path of ['/', '/mercado', '/nft/emerald-ape-042', '/cart', '/login']) {
  test(`no serious accessibility violations on ${path}`, async ({ app }) => {
    await app.open(path)
    expect(await seriousViolations(app.page)).toEqual([])
  })
}

test('no serious accessibility violations on private screens', async ({ app }) => {
  const { page } = app
  await app.login('ana')
  await addToCart(page, 'emerald-ape-042')
  for (const path of ['/cart', '/checkout', '/profile', '/profile/wallets', '/favorites']) {
    await page.goto(path)
    await expect(page.locator('html')).toHaveAttribute('data-app-ready', '')
    expect(await seriousViolations(page), path).toEqual([])
  }
  await openReview(page)
  await page.getByRole('dialog').evaluate((dialog) => Promise.all(dialog.getAnimations({ subtree: true }).map((animation) => animation.finished)))
  expect(await seriousViolations(page), 'review dialog').toEqual([])
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
  expect(await seriousViolations(page), 'receipt').toEqual([])
})

test('keyboard: skip link and visible focus', async ({ app }) => {
  const { page } = app
  await app.open('/')
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
  await page.keyboard.press('Tab')
  const outline = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement!)
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) }
  })
  expect(outline.style).not.toBe('none')
  expect(outline.width).toBeGreaterThan(0)
})

test('dialog traps focus and returns it on close', async ({ app, isMobile }) => {
  test.skip(isMobile, 'search trigger of the desktop header')
  const { page } = app
  await app.open('/')
  const trigger = page.getByRole('button', { name: 'Buscar NFTs' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Buscar NFTs')).toBeFocused()
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab')
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('form announces errors tied to the fields', async ({ app }) => {
  const { page } = app
  await app.open('/login')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  const email = dialog.getByLabel('E-mail')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  const describedBy = await email.getAttribute('aria-describedby')
  await expect(page.locator(`#${describedBy}`)).toHaveText('Informe o e-mail')
})

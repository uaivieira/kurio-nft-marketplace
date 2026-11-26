import AxeBuilder from '@axe-core/playwright'
import { expect, test } from './fixtures'

for (const path of ['/', '/mercado', '/nft/emerald-ape-042', '/cart', '/login']) {
  test(`no serious accessibility violations on ${path}`, async ({ app }) => {
    await app.open(path)
    await app.page.waitForLoadState('networkidle')
    const results = await new AxeBuilder({ page: app.page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`)).toEqual([])
  })
}

test('keyboard: skip link and visible focus', async ({ app }) => {
  const { page } = app
  await app.open('/')
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
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

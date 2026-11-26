import type { Page } from '@playwright/test'
import { addToCart, expect, test } from './fixtures'

const WIDTHS = [768, 900, 1024, 1100, 1280, 1440]

const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

async function placeOrder(page: Page) {
  await addToCart(page, 'emerald-ape-042', 1)
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conectada:/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page).toHaveURL(/\/orders\//)
  await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
  return new URL(page.url()).pathname
}

async function purchaseRowClearsMetadata(page: Page) {
  return page.evaluate(() => {
    const row = document.querySelector('[data-testid="purchase-row"]')!
    const metadata = row.parentElement!.parentElement!.querySelector('dl')!.getBoundingClientRect()
    const lowest = Math.max(...[...row.querySelectorAll('button, output, p')].map((element) => element.getBoundingClientRect()).filter((rect) => rect.height > 0).map((rect) => rect.bottom))
    return { lowest: Math.round(lowest), metadataTop: Math.round(metadata.top) }
  })
}

test.describe('tablet and narrow desktop layout', () => {
  test.skip(({ isMobile }) => isMobile, 'widths are set explicitly in the desktop project')

  for (const width of WIDTHS) {
    test(`no overlap or horizontal scroll at ${width}px`, async ({ app }) => {
      test.setTimeout(120_000)
      const { page } = app
      await page.setViewportSize({ width, height: 900 })
      await app.login('ana')
      const order = await placeOrder(page)
      await addToCart(page, 'emerald-ape-042', 2)
      await addToCart(page, 'sage-nomad-009', 1)
      await addToCart(page, 'violet-nomad-314', 1)

      for (const path of ['/', '/mercado', '/nft/emerald-ape-042', '/cart', '/checkout', order]) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        expect(await horizontalOverflow(page), `horizontal scroll on ${path}`).toBeLessThanOrEqual(0)
      }

      await page.goto('/nft/emerald-ape-042')
      const price = page.getByTestId('detail-price')
      await expect(price).toBeVisible()
      await expect
        .poll(() => price.evaluate((element) => {
          const range = document.createRange()
          range.selectNodeContents(element)
          return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size
        }), { message: 'detail price on one line' })
        .toBe(1)

      let clearance = await purchaseRowClearsMetadata(page)
      expect(clearance.lowest, 'purchase row above the metadata').toBeLessThanOrEqual(clearance.metadataTop)
      await page.getByRole('radio', { name: '1/1', exact: true }).click()
      await expect(page.getByText('Limite de 1 unidade para esta edição.')).toBeVisible()
      clearance = await purchaseRowClearsMetadata(page)
      expect(clearance.lowest, 'purchase row with the limit notice above the metadata').toBeLessThanOrEqual(clearance.metadataTop)

      await page.goto('/cart')
      await expect(page.getByTestId('total')).toBeVisible()
      const baselines = await page.getByTestId('totals').evaluate((list) => {
        const textBottom = (element: Element) => {
          const range = document.createRange()
          range.selectNodeContents(element)
          return range.getClientRects()[0]!.bottom
        }
        return [...list.querySelectorAll('dt')].map((term) => ({ label: term.textContent, delta: Math.abs(textBottom(term) - textBottom(term.nextElementSibling!)) }))
      })
      for (const { label, delta } of baselines) expect(delta, `baseline of "${label}"`).toBeLessThanOrEqual(2)
    })
  }
})

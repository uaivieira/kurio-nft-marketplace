import type { Page } from '@playwright/test'
import { addToCart, expect, test } from './fixtures'

const WIDTHS = [768, 900, 1024, 1100, 1280, 1440, 1706]

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

  test('header actions line up with the menu text', async ({ app }) => {
    const { page } = app
    const textMiddle = (selector: string) => page.locator(selector).first().evaluate((element) => {
      const range = document.createRange()
      range.selectNodeContents(element)
      const box = range.getBoundingClientRect()
      return (box.top + box.bottom) / 2
    })
    const boxMiddle = (selector: string) => page.locator(selector).first().evaluate((element) => {
      const box = element.getBoundingClientRect()
      return (box.top + box.bottom) / 2
    })
    for (const width of [768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await app.open('/mercado')
      const menu = await textMiddle('header nav a')
      expect(Math.abs((await textMiddle('header a[href^="/login"]')) - menu), `login at ${width}px`).toBeLessThanOrEqual(1)
      expect(Math.abs((await boxMiddle('header [data-testid="header-actions"] button')) - menu), `search at ${width}px`).toBeLessThanOrEqual(1)
      expect(Math.abs((await boxMiddle('header a[href="/cart"] svg')) - menu), `cart at ${width}px`).toBeLessThanOrEqual(1)
    }
    await app.login('ana')
    await page.goto('/mercado')
    await expect(page.locator('header a[href="/profile"]')).toBeVisible()
    expect(Math.abs((await textMiddle('header a[href="/profile"] span')) - (await textMiddle('header nav a')))).toBeLessThanOrEqual(1)
  })

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

      const truncatedNames = await page.getByTestId('cart-line').evaluateAll((lines) => lines.map((line) => line.querySelector('p[title]')!).filter((name) => name.scrollWidth > name.clientWidth).map((name) => name.textContent))
      expect(truncatedNames, 'cart names fit on one line').toEqual([])

      const footer = page.getByRole('contentinfo')
      const chip = footer.getByText(/MetaMask/)
      expect(await chip.evaluate((element) => element.getBoundingClientRect().height), 'wallet chip on one line').toBeLessThanOrEqual(26)
      expect(await chip.evaluate((element) => element.scrollWidth <= element.clientWidth), 'wallet names fit the chip').toBe(true)
      const newsletter = footer.getByRole('textbox')
      expect(await newsletter.evaluate((input: HTMLInputElement) => {
        input.value = input.placeholder
        const clipped = input.scrollWidth > input.clientWidth
        input.value = ''
        return clipped
      }), 'newsletter placeholder fits').toBe(false)
      if (width >= 1024) {
        const wrapped = await footer.getByRole('heading', { level: 2 }).evaluateAll((headings) => headings.slice(0, 3).filter((heading) => heading.getBoundingClientRect().height > parseFloat(getComputedStyle(heading).lineHeight) * 1.5).map((heading) => heading.textContent))
        expect(wrapped, 'footer feature titles on one line').toEqual([])
      }
    })
  }
})

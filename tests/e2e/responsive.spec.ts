import { addToCart, expect, test } from './fixtures'

const WIDTHS = [320, 390, 768, 1440]
const PUBLIC = ['/', '/mercado', '/nft/emerald-ape-042', '/cart', '/login', '/signup']
const PRIVATE = ['/checkout', '/profile', '/profile/wallets', '/favorites']

test.describe('no horizontal overflow', () => {
  test.skip(({ isMobile }) => isMobile, 'widths are set explicitly in the desktop project')

  for (const width of WIDTHS) {
    test(`main routes at ${width}px`, async ({ app }) => {
      test.setTimeout(90_000)
      const { page } = app
      await page.setViewportSize({ width, height: 900 })
      await app.login('ana')
      await addToCart(page, 'emerald-ape-042', 2)
      for (const path of [...PRIVATE, ...PUBLIC]) {
        if (path === PUBLIC[0]) await page.evaluate(() => localStorage.removeItem('kurio:session'))
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${path} at ${width}px`).toBeLessThanOrEqual(0)
      }
    })
  }
})

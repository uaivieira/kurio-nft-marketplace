import { addToCart, expect, test } from './fixtures'

// 320 px = 1280 px at 400% zoom (WCAG 1.4.10 reflow).
const WIDTHS = [320, 390, 768, 1440]
const PUBLIC = ['/', '/nft/emerald-ape-042', '/cart', '/login', '/signup']
const PRIVATE = ['/checkout', '/profile', '/profile/wallets', '/favorites']

test.describe('sem overflow horizontal', () => {
  test.skip(({ isMobile }) => isMobile, 'larguras controladas explicitamente no projeto desktop')

  for (const width of WIDTHS) {
    test(`rotas principais em ${width}px`, async ({ app }) => {
      test.setTimeout(90_000)
      const { page } = app
      await page.setViewportSize({ width, height: 900 })
      await app.login('ana')
      await addToCart(page, 'emerald-ape-042', 2)
      for (const path of [...PRIVATE, ...PUBLIC]) {
        // Public screens are checked as a visitor (login/signup redirect authenticated users).
        if (path === PUBLIC[0]) await page.evaluate(() => localStorage.removeItem('kurio:session'))
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${path} em ${width}px`).toBeLessThanOrEqual(0)
      }
    })
  }
})

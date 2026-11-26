import { addToCart, expect, test } from './fixtures'

test.describe('visual regression', () => {
  test('home', async ({ app }) => {
    await app.open('/')
    await expect(app.page.getByTestId('nft-card').first()).toBeVisible()
    await app.page.waitForLoadState('networkidle')
    await expect(app.page).toHaveScreenshot('home.png', { fullPage: true })
  })

  test('detail', async ({ app }) => {
    await app.open('/nft/emerald-ape-042')
    await expect(app.page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
    await app.page.waitForLoadState('networkidle')
    await expect(app.page).toHaveScreenshot('detail.png', { fullPage: true })
  })

  test('cart', async ({ app }) => {
    await app.open('/')
    await addToCart(app.page, 'emerald-ape-042', 2)
    await addToCart(app.page, 'violet-nomad-314', 3)
    await addToCart(app.page, 'ivory-baron-088', 2)
    await app.page.goto('/cart')
    await expect(app.page.getByTestId('total')).toBeVisible()
    await app.page.waitForLoadState('networkidle')
    await expect(app.page).toHaveScreenshot('cart.png', { fullPage: true })
  })

  test('payment', async ({ app, isMobile }) => {
    await app.login('ana')
    await addToCart(app.page, 'emerald-ape-042', 2)
    await addToCart(app.page, 'violet-nomad-314', 3)
    await app.page.goto('/checkout')
    await expect(app.page.getByTestId(isMobile ? 'mobile-total' : 'total')).toContainText('ETH')
    await expect(app.page.getByLabel('Nome de exibição')).toHaveValue('Ana Souza')
    await app.page.waitForLoadState('networkidle')
    await expect(app.page).toHaveScreenshot('payment.png', { fullPage: true })
  })
})

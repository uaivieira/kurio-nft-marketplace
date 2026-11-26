import { expect, test } from './fixtures'

test.describe('recommendation carousels', () => {
  test('collection carousel has three unique pages and keyboard or dot navigation', async ({ app, isMobile }) => {
    test.skip(isMobile, 'recommendations carousel belongs to the desktop layout')
    const { page } = app
    await app.open('/nft/emerald-ape-042')
    const carousel = page.getByRole('region', { name: 'Mais desta coleção' })
    await carousel.scrollIntoViewIfNeeded()
    await expect(carousel.getByTestId('carousel-page-1').getByTestId('nft-card')).toHaveCount(5)
    await expect(carousel.getByRole('button', { name: /^Ir para a página/ })).toHaveCount(3)
    await expect(carousel.getByRole('button', { name: 'Ir para a página 1 de 3' })).toHaveAttribute('aria-current', 'page')
    const names = await carousel.getByTestId('nft-card').locator('h3').allTextContents()
    expect(new Set(names).size).toBe(15)
    await carousel.getByRole('button', { name: 'Ir para a página 2 de 3' }).click()
    await expect(carousel.getByRole('button', { name: 'Ir para a página 2 de 3' })).toHaveAttribute('aria-current', 'page')
    await carousel.getByRole('group', { name: 'Ir para a página 2 de 3' }).getByTestId('nft-card').first().waitFor()
    await carousel.getByRole('group', { name: 'Mais desta coleção' }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(carousel.getByRole('button', { name: 'Ir para a página 3 de 3' })).toHaveAttribute('aria-current', 'page')
  })

  test('cart carousel uses unique catalog items across all pages', async ({ app, isMobile }) => {
    test.skip(isMobile, 'recommendations carousel belongs to the desktop layout')
    const { page } = app
    await app.open('/cart')
    const carousel = page.getByRole('region', { name: 'Colecionadores também viram' })
    await expect(carousel.getByTestId('carousel-page-1').getByTestId('nft-card')).toHaveCount(5)
    await expect(carousel.getByRole('button', { name: /^Ir para a página/ })).toHaveCount(3)
    await expect(carousel.getByRole('button', { name: 'Ir para a página 1 de 3' })).toHaveAttribute('aria-current', 'page')
    const names = await carousel.getByTestId('nft-card').locator('h3').allTextContents()
    expect(new Set(names).size).toBe(15)
    await carousel.getByRole('button', { name: 'Ir para a página 3 de 3' }).click()
    await expect(carousel.getByRole('button', { name: 'Ir para a página 3 de 3' })).toHaveAttribute('aria-current', 'page')
  })
})

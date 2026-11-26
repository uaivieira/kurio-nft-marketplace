import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

async function expectMarketplaceComposition(page: Page) {
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  await expect(page.getByText('NFT em destaque')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Campanhas' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Diário da Cunhagem' })).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)
}

test.describe('marketplace page', () => {
  test('direct access and refresh', async ({ app }) => {
    const { page } = app
    await app.open('/mercado')
    await expect(page).toHaveURL('/mercado')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectMarketplaceComposition(page)
    await page.reload()
    await expect(page).toHaveURL('/mercado')
    await expectMarketplaceComposition(page)
  })

  test('the home keeps the featured NFT, editorial and footer', async ({ app, isMobile }) => {
    test.skip(isMobile, 'featured NFT, editorial and footer belong to the desktop layout')
    const { page } = app
    await app.open('/')
    await expect(page.getByText('NFT em destaque')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Diário da Cunhagem' })).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('header: Mercado scrolls to the home listing and opens the market from other routes', async ({ app, isMobile }) => {
    test.skip(isMobile, 'desktop header')
    const { page } = app
    await app.open('/')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Mercado' })).not.toHaveAttribute('aria-current', 'page')

    await nav.getByRole('link', { name: 'Mercado' }).click()
    await expect(page).toHaveURL('/')
    await expect.poll(() => page.locator('#catalogo').evaluate((element) => element.getBoundingClientRect().top), { timeout: 5000 }).toBeLessThan(32)
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')

    await app.open('/nft/emerald-ape-042')
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mercado' }).click()
    await expect(page).toHaveURL('/mercado')
    await expect.poll(() => page.locator('#catalogo').evaluate((element) => element.getBoundingClientRect().top), { timeout: 5000 }).toBeLessThan(32)

    await page.emulateMedia({ reducedMotion: 'reduce' })
    await app.open('/')
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mercado' }).click()
    await expect.poll(() => page.locator('#catalogo').evaluate((element) => element.getBoundingClientRect().top)).toBeLessThan(32)
    await expect(page).toHaveURL('/')
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
  })

  test('filters, sorting, tabs and pagination stay on /mercado', async ({ app, isMobile }) => {
    test.skip(isMobile, 'sidebar filters and sorting belong to the desktop layout')
    const { page } = app
    await app.open('/mercado')
    await page.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/^[^?]+\/mercado\?collections=/)
    await page.getByLabel('Ordenar por:').selectOption({ label: 'Menor preço' })
    await expect(page).toHaveURL(/\/mercado\?.*sort=price-asc/)
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page).not.toHaveURL(/collections=/)
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/\/mercado\?.*page=2/)
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await page.getByRole('tab', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/\/mercado\?.*tab=trending/)
    await page.getByRole('link', { name: 'Explorar' }).click()
    await expect(page).toHaveURL(/\/mercado#catalogo$/)
    await expectMarketplaceComposition(page)
  })

  test('mobile: search and filter drawer stay on /mercado', async ({ app, isMobile }) => {
    test.skip(!isMobile, 'mobile layout')
    const { page } = app
    await app.open('/mercado')
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Nomad')
    await expect(page).toHaveURL(/\/mercado\?q=Nomad/)
    await page.getByRole('button', { name: 'Filtros' }).click()
    await page.getByRole('dialog').getByRole('button', { name: /^Arte digital/ }).click()
    await expect(page).toHaveURL(/\/mercado\?.*collections=/)
    await expect(page.getByTestId('nft-card').first()).toContainText('Nomad')
  })

  for (const path of ['/login', '/signup']) {
    test(`${path} opens over the marketplace composition`, async ({ app, isMobile }) => {
      test.skip(isMobile, 'on mobile the dialog fills the screen')
      const { page } = app
      await app.open(path)
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectMarketplaceComposition(page)
    })
  }
})

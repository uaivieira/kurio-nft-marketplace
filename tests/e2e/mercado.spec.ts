import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'

/** Featured NFT, editorial sections and footer: parts of the home that the marketplace page leaves out. */
async function expectMarketplaceComposition(page: Page) {
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
  await expect(page.getByText('NFT em destaque')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Campanhas' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Diário da Cunhagem' })).toHaveCount(0)
  await expect(page.locator('footer')).toHaveCount(0)
}

test.describe('página Mercado', () => {
  test('acesso direto e refresh', async ({ app }) => {
    const { page } = app
    await app.open('/mercado')
    await expect(page).toHaveURL('/mercado')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectMarketplaceComposition(page)
    await page.reload()
    await expect(page).toHaveURL('/mercado')
    await expectMarketplaceComposition(page)
  })

  test('a home continua com destaque, editorial e rodapé', async ({ app, isMobile }) => {
    test.skip(isMobile, 'destaque, editorial e rodapé são do layout desktop')
    const { page } = app
    await app.open('/')
    await expect(page.getByText('NFT em destaque')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Diário da Cunhagem' })).toBeVisible()
    await expect(page.locator('footer')).toBeVisible()
  })

  test('cabeçalho: Mercado leva a /mercado e fica ativo só lá', async ({ app, isMobile }) => {
    test.skip(isMobile, 'cabeçalho desktop')
    const { page } = app
    await app.open('/')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Mercado' })).not.toHaveAttribute('aria-current', 'page')

    await nav.getByRole('link', { name: 'Mercado' }).click()
    await expect(page).toHaveURL('/mercado')
    await expect(nav.getByRole('link', { name: 'Mercado' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current', 'page')
  })

  test('filtros, ordenação, abas e paginação continuam em /mercado', async ({ app, isMobile }) => {
    test.skip(isMobile, 'filtros laterais e ordenação são do layout desktop')
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

  test('mobile: busca e gaveta de filtros continuam em /mercado', async ({ app, isMobile }) => {
    test.skip(!isMobile, 'layout mobile')
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
    test(`${path} abre sobre a composição do Mercado`, async ({ app, isMobile }) => {
      test.skip(isMobile, 'no mobile o diálogo ocupa a tela inteira')
      const { page } = app
      await app.open(path)
      await expect(page.getByRole('dialog')).toBeVisible()
      await expectMarketplaceComposition(page)
    })
  }
})

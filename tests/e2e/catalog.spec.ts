import { apiFetch, expect, test } from './fixtures'
import type { Page } from '@playwright/test'

test.describe('catálogo', () => {
  test.skip(({ isMobile }) => isMobile, 'filtros laterais e ordenação são do layout desktop; o mobile é coberto em mobile-catalog')

  async function gridNames(page: Page) {
    await expect(page.getByTestId('catalog-grid')).toHaveAttribute('aria-busy', 'false')
    return page.getByTestId('nft-card').locator('h3').allTextContents()
  }

  async function apiNames(page: Page, query: string) {
    const { body } = await apiFetch<{ items: { name: string }[] }>(page, `/nfts?${query}`)
    return body.items.map((item) => item.name)
  }

  test('filtros combinados, ordenação, paginação e histórico', async ({ app }) => {
    const { page } = app
    await app.open('/')
    await expect(page.getByTestId('nft-card').first()).toBeVisible()

    await page.getByRole('button', { name: /^Música/ }).click()
    await expect(page).toHaveURL(/collections=/)
    await page.getByRole('button', { name: /^Polygon/ }).click()
    await expect(page).toHaveURL(/networks=/)
    expect(await gridNames(page)).toEqual(await apiNames(page, 'collection=musica&network=polygon'))

    await page.getByLabel('Ordenar por:').selectOption({ label: 'Menor preço' })
    await expect(page).toHaveURL(/sort=price-asc/)
    expect(await gridNames(page)).toEqual(await apiNames(page, 'collection=musica&network=polygon&sort=price-asc'))

    // History restores the previous combination.
    await page.goBack()
    await expect(page).not.toHaveURL(/sort=/)
    expect(await gridNames(page)).toEqual(await apiNames(page, 'collection=musica&network=polygon'))

    // Refresh keeps the URL state.
    await page.reload()
    await expect(page.getByRole('button', { name: /^Música/ })).toHaveAttribute('aria-pressed', 'true')
    expect(await gridNames(page)).toEqual(await apiNames(page, 'collection=musica&network=polygon'))
  })

  test('paginação reinicia ao mudar filtro', async ({ app }) => {
    const { page } = app
    await app.open('/')
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    expect(await gridNames(page)).toEqual(await apiNames(page, 'page=2'))
    await page.getByRole('button', { name: /^Ethereum/ }).click()
    await expect(page).not.toHaveURL(/page=/)
    expect(await gridNames(page)).toEqual(await apiNames(page, 'network=ethereum'))
  })

  test('busca e resultado vazio', async ({ app }) => {
    const { page } = app
    await app.open('/')
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    await page.getByRole('dialog').getByLabel('Buscar NFTs').fill('Golden')
    await page.getByRole('dialog').getByRole('button', { name: 'Buscar' }).click()
    await expect(page).toHaveURL(/q=Golden/)
    for (const name of await gridNames(page)) expect(name).toContain('Golden')

    await page.goto('/?q=zzzz')
    await expect(page.getByTestId('catalog-empty')).toBeVisible()
  })

  test('respostas fora de ordem não sobrescrevem a consulta mais recente', async ({ app }) => {
    const { page } = app
    // Fake clock: the seeded jitter latencies (80 ms–1.8 s) are released by advancing time, not by waiting.
    await page.clock.install()
    await app.open('/', 'jitter')
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 10_000 })
    // Fire several filter changes faster than the variable latency resolves.
    await page.getByRole('button', { name: /^Música/ }).click()
    await page.getByRole('button', { name: /^Fotografia/ }).click()
    await page.getByRole('button', { name: /^Solana/ }).click()
    await expect(page).toHaveURL(/networks=/)
    await page.clock.fastForward(2000)
    await expect(page.getByTestId('catalog-grid')).toHaveAttribute('aria-busy', 'false')
    const expected = await apiNames(page, 'collection=musica&collection=fotografia&network=solana')
    expect(await gridNames(page)).toEqual(expected)
  })
})

test('catálogo mobile: busca e filtros na gaveta', async ({ app, isMobile }) => {
  test.skip(!isMobile, 'layout mobile')
  const { page } = app
  await app.open('/')
  await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('Nomad')
  await expect(page).toHaveURL(/q=Nomad/)
  await page.getByRole('button', { name: 'Filtros' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /^Arte digital/ }).click()
  await expect(page).toHaveURL(/collections=/)
  await expect(page.getByTestId('nft-card').first()).toContainText('Nomad')
})

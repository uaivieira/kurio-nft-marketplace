import { expect, test } from './fixtures'

test.describe('páginas pré-renderizadas', () => {
  for (const [path, name] of [['/', 'Emerald Ape #042'], ['/mercado', 'Emerald Ape #042'], ['/nft/ivory-baron-088', 'Ivory Baron #088']] as const) {
    test(`${path} já vem com o conteúdo no HTML`, async ({ app }) => {
      const html = await (await app.page.request.get(path)).text()
      expect(html).toContain(name)
      expect(html).toContain('ETH')
      expect(html).toContain(`data-prerender-path="${path}"`)
      expect(html).toContain('<script type="application/json" id="kurio-state">')
    })

    test(`${path} assume o HTML sem deslocamento de layout`, async ({ app }) => {
      const { page } = app
      // Record every layout shift from the very first paint.
      await page.addInitScript(() => {
        const shifts: number[] = ((window as unknown as { __shifts: number[] }).__shifts = [])
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
            if (!entry.hadRecentInput) shifts.push(entry.value)
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await app.open(path)
      await expect(page.getByText(name).first()).toBeVisible()
      await page.waitForLoadState('networkidle')
      const total = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts.reduce((sum, value) => sum + value, 0))
      expect(total).toBeLessThan(0.01)
    })
  }

  test('URL com filtros não mostra o catálogo padrão pré-renderizado', async ({ app }) => {
    const { page } = app
    await page.goto('/?q=Golden')
    await page.waitForFunction(() => Boolean(window.__kurio))
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    for (const name of await page.getByTestId('nft-card').locator('h3').allTextContents()) expect(name).toContain('Golden')
  })

  test('rota não pré-renderizada não exibe a home ao carregar', async ({ app }) => {
    const { page } = app
    const html = await (await page.request.get('/cart')).text()
    // The SPA fallback serves the home's HTML, marked stale before first paint.
    expect(html).toContain('data-prerender-stale')
    await page.goto('/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-prerender-stale')
  })
})

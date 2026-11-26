import { expect, test } from './fixtures'

test.describe('prerendered pages', () => {
  for (const [path, name] of [['/', 'Emerald Ape #042'], ['/mercado', 'Emerald Ape #042'], ['/nft/ivory-baron-088', 'Ivory Baron #088']] as const) {
    test(`${path} ships its content in the HTML`, async ({ app }) => {
      const html = await (await app.page.request.get(path)).text()
      expect(html).toContain(name)
      expect(html).toContain('ETH')
      expect(html).toContain(`data-prerender-path="${path}"`)
      expect(html).toContain('<script type="application/json" id="kurio-state">')
    })

    test(`${path} takes over the HTML without layout shift`, async ({ app }) => {
      const { page } = app
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

  test('a URL with filters does not show the prerendered default catalog', async ({ app }) => {
    const { page } = app
    await page.goto('/?q=Golden')
    await page.waitForFunction(() => Boolean(window.__kurio))
    await expect(page.getByTestId('nft-card').first()).toBeVisible()
    for (const name of await page.getByTestId('nft-card').locator('h3').allTextContents()) expect(name).toContain('Golden')
  })

  test('a route that is not prerendered does not show the home while loading', async ({ app }) => {
    const { page } = app
    const html = await (await page.request.get('/cart')).text()
    expect(html).toContain('data-prerender-stale')
    await page.goto('/cart')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-prerender-stale')
  })
})

import { addToCart, expect, test, USERS } from './fixtures'

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

  test('a saved scenario hides the prerendered default catalog', async ({ app }) => {
    const { page } = app
    await app.open('/', 'empty-catalog')
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-app-ready', '')
    await expect(page.getByTestId('catalog-empty')).toBeVisible()
    await expect(page.locator('section[aria-labelledby="catalog-title"]').getByTestId('nft-card')).toHaveCount(0)
  })

  for (const [path, url] of [['/login', '/login'], ['/profile', '/login?redirect=%2Fprofile'], ['/checkout', '/login?redirect=%2Fcheckout'], ['/cart', '/cart']] as const) {
    test(`${path} ships its content for a new visitor and takes over without layout shift`, async ({ app }) => {
      const { page } = app
      const html = await (await page.request.get(path)).text()
      expect(html).toContain(`data-prerender-path="${path}"`)
      expect(html).toContain(path === '/cart' ? 'data-testid="cart-empty"' : 'toolname="log_in"')
      await page.addInitScript(() => {
        const shifts: number[] = ((window as unknown as { __shifts: number[] }).__shifts = [])
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<PerformanceEntry & { value: number; hadRecentInput: boolean }>) {
            if (!entry.hadRecentInput) shifts.push(entry.value)
          }
        }).observe({ type: 'layout-shift', buffered: true })
      })
      await app.open(path)
      await expect(page).toHaveURL(url)
      await expect(page.locator('html')).not.toHaveAttribute('data-prerender-stale')
      await page.waitForLoadState('networkidle')
      const total = await page.evaluate(() => (window as unknown as { __shifts: number[] }).__shifts.reduce((sum, value) => sum + value, 0))
      expect(total).toBeLessThan(0.01)
    })
  }

  test('a signed-in user never sees the login gate of a private route', async ({ app }) => {
    const { page } = app
    await app.login('ana')
    await page.goto('/profile')
    await expect(page).toHaveURL('/profile')
    await expect(page.getByRole('main').getByLabel('E-mail')).toHaveValue('ana@kurio.test')
    await expect(page.locator('form[toolname="log_in"]')).toHaveCount(0)
  })

  test('a returning visitor with a cart gets the live cart, not the empty prerender', async ({ app }) => {
    const { page } = app
    await app.open('/')
    await addToCart(page, 'emerald-ape-042')
    await page.goto('/cart')
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    await expect(page.getByTestId('cart-empty')).toHaveCount(0)
  })

  test('text typed before the app takes over is kept', async ({ app }) => {
    const { page } = app
    let release: () => void = () => {}
    const held = new Promise<void>((resolve) => { release = resolve })
    await page.route(/\/assets\/index-[^/]+\.js$/, async (route) => {
      await held
      await route.continue()
    })
    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    const email = page.locator('input[name="email"]')
    await email.fill(USERS.ana.email)
    await page.locator('input[name="password"]').fill(USERS.ana.password)
    release()
    await expect(page.locator('html')).toHaveAttribute('data-app-ready', '')
    await expect(email).toHaveValue(USERS.ana.email)
    await page.getByRole('dialog').getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(page).toHaveURL('/')
    await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('kurio:session') ?? 'null') as { user: { email: string } } | null)?.user.email)).toBe(USERS.ana.email)
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

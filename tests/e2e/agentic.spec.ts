import { expect, test, USERS } from './fixtures'

declare global {
  interface Window {
    __webmcp?: Record<string, { description: string; inputSchema: Record<string, unknown>; execute: (input: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }> }>
  }
}

test.describe('agent discovery files', () => {
  test('llms.txt is Markdown with a title and links', async ({ page }) => {
    const response = await page.request.get('/llms.txt')
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toMatch(/^# Kurio/m)
    expect(body).toMatch(/\[.+\]\(https:\/\/.+\)/)
    expect(body).not.toContain('<!doctype html>')
  })

  for (const path of ['/.well-known/ard.json', '/.well-known/ai-catalog.json']) {
    test(`${path} is an ARD manifest`, async ({ page }) => {
      const response = await page.request.get(path)
      expect(response.status()).toBe(200)
      const manifest = (await response.json()) as { specVersion: string; entries: Array<Record<string, unknown>> }
      expect(manifest.specVersion).toBe('1.0')
      expect(manifest.entries).toHaveLength(1)
      const [entry] = manifest.entries
      expect(entry!.identifier).toMatch(/^urn:air:[a-zA-Z0-9.-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+$/)
      expect(entry!.type).toBe('text/markdown; profile="urn:air:agent-skills"')
      expect((entry!.representativeQueries as string[]).length).toBeGreaterThanOrEqual(2)
      const skill = await page.request.get(new URL(entry!.url as string).pathname)
      expect(skill.status()).toBe(200)
      expect(await skill.text()).toMatch(/^---\nname: kurio-marketplace/)
    })
  }
})

test.describe('WebMCP tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const tools: NonNullable<Window['__webmcp']> = (window.__webmcp = {})
      Object.defineProperty(navigator, 'modelContext', { value: { registerTool: (tool: { name: string } & (typeof tools)[string]) => { tools[tool.name] = tool } } })
    })
  })

  const call = (page: import('@playwright/test').Page, name: string, input: Record<string, unknown> = {}) =>
    page.evaluate(async ([tool, args]) => {
      const result = await window.__webmcp![tool as string]!.execute(args as Record<string, unknown>)
      return { isError: Boolean(result.isError), data: JSON.parse(result.content[0]!.text) as Record<string, unknown> }
    }, [name, input] as const)

  test('an agent searches, reads an NFT and fills the cart through the real API', async ({ app }) => {
    const { page } = app
    await app.open('/')
    await expect.poll(() => page.evaluate(() => Object.keys(window.__webmcp ?? {}).sort()), { timeout: 15_000 }).toEqual(['add_to_cart', 'get_cart', 'get_nft', 'open_page', 'search_nfts'])
    expect(await page.evaluate(() => window.__webmcp!.search_nfts!.inputSchema.type)).toBe('object')

    const search = await call(page, 'search_nfts', { q: 'Ape', sort: 'price-asc' })
    const items = search.data.items as Array<{ id: string; name: string }>
    expect(items.length).toBeGreaterThan(0)
    for (const item of items) expect(item.name).toContain('Ape')

    const nft = await call(page, 'get_nft', { nftId: 'emerald-ape-042' })
    const edition = (nft.data.editions as Array<{ id: string; available: number }>).find((candidate) => candidate.available > 1)!
    const added = await call(page, 'add_to_cart', { nftId: 'emerald-ape-042', editionId: edition.id, quantity: 2 })
    expect(added.isError).toBe(false)
    expect(added.data.itemCount).toBe(2)
    await expect(page.getByTestId('live-region')).toContainText('Emerald Ape #042 adicionado ao carrinho por um assistente')
    await expect(page.getByRole('link', { name: /Carrinho.*2/ }).first()).toBeVisible()

    expect((await call(page, 'open_page', { path: '/cart' })).data.opened).toBe('/cart')
    await expect(page).toHaveURL('/cart')
    await expect(page.getByTestId('cart-line')).toHaveCount(1)
    const cart = await call(page, 'get_cart')
    await expect(page.getByTestId('total')).toHaveText(`${(cart.data.quote as { total: string }).total} ETH`)
  })

  test('tool errors come back as results, and outside paths are refused', async ({ app }) => {
    const { page } = app
    await app.open('/')
    await expect.poll(() => page.evaluate(() => Object.keys(window.__webmcp ?? {}).length), { timeout: 15_000 }).toBe(5)
    const invalid = await call(page, 'add_to_cart', { nftId: 'emerald-ape-042', editionId: 'e50', quantity: 0 })
    expect(invalid.isError).toBe(true)
    expect(invalid.data.error).toBe('INVALID_INPUT')
    const missing = await call(page, 'get_nft', { nftId: 'does-not-exist' })
    expect(missing).toMatchObject({ isError: true, data: { error: 'NOT_FOUND' } })
    expect((await call(page, 'open_page', { path: '//evil.example' })).data.opened).toBe('/')
  })

  test('forms carry declarative annotations and are never auto-submitted', async ({ app }) => {
    const { page } = app
    await app.open('/login')
    const form = page.locator('form[toolname="log_in"]')
    await expect(form).toHaveAttribute('tooldescription', /Log in/)
    await expect(form).not.toHaveAttribute('toolautosubmit')
    await expect(form.locator('input[name="email"]')).toHaveAttribute('toolparamtitle', 'E-mail')
    await form.locator('input[name="email"]').fill(USERS.ana.email)
  })
})

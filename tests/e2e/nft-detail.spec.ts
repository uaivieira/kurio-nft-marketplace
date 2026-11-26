import { expect, test } from './fixtures'

test('desktop purchase actions stay beside the quantity', async ({ app, isMobile }) => {
  test.skip(isMobile, 'desktop purchase row')
  const { page } = app
  await app.open('/nft/ivory-baron-088')
  for (const width of [1024, 1100, 1280, 1440, 1706]) {
    await page.setViewportSize({ width, height: 900 })
    const row = page.getByTestId('purchase-row')
    const quantity = await row.getByRole('group').boundingBox()
    const buy = await row.getByRole('button', { name: /^Comprar$/i }).boundingBox()
    const favorite = await row.getByRole('button', { name: /Favoritar/ }).boundingBox()
    expect(Math.abs(buy!.y - quantity!.y), `purchase alignment at ${width}px`).toBeLessThanOrEqual(1)
    expect(Math.abs(favorite!.y - buy!.y)).toBeLessThanOrEqual(1)
    expect(buy!.x).toBeGreaterThanOrEqual(quantity!.x + quantity!.width)
    expect(favorite!.x).toBeGreaterThanOrEqual(buy!.x + buy!.width)
  }
})

test('wide-screen detail stays aligned with the site header', async ({ app, isMobile }) => {
  test.skip(isMobile, 'desktop widths are exercised explicitly')
  const { page } = app
  await app.open('/nft/ivory-baron-088')
  for (const width of [1440, 1536, 1706, 1920, 2928]) {
    await page.setViewportSize({ width, height: 900 })
    const bounds = await page.evaluate(() => {
      const header = document.querySelector('header')!.getBoundingClientRect()
      const article = document.querySelector('article')!.getBoundingClientRect()
      const image = document.querySelector('article img[fetchpriority="high"]')!.getBoundingClientRect()
      return {
        left: Math.abs(article.left - header.left),
        right: Math.abs(article.right - header.right),
        imageWidth: image.width,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      }
    })
    expect(bounds.left, `left alignment at ${width}px`).toBeLessThanOrEqual(1)
    expect(bounds.right, `right alignment at ${width}px`).toBeLessThanOrEqual(1)
    expect(bounds.imageWidth, `bounded gallery at ${width}px`).toBeLessThanOrEqual(444)
    expect(bounds.overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0)
  }
})

test('direct access to the detail page', async ({ app }) => {
  await app.open('/nft/ivory-baron-088')
  await expect(app.page.getByRole('heading', { name: 'Ivory Baron #088' })).toBeVisible()
})

test('missing NFT', async ({ app }) => {
  await app.open('/nft/missing-999')
  await expect(app.page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('missing route', async ({ app }) => {
  await app.open('/route/that/does/not/exist')
  await expect(app.page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})

test('sold-out edition is unavailable', async ({ app }) => {
  const { page } = app
  await app.open('/nft/onyx-relic-404')
  for (const label of ['1/1', '1/10', '1/50', 'ABERTA']) {
    await expect(page.getByRole('radio', { name: `${label} (esgotada)`, exact: true })).toBeDisabled()
  }
  await expect(page.getByRole('button', { name: /Comprar/i }).first()).toBeDisabled()
})

test('quantity limit by availability', async ({ app }) => {
  const { page } = app
  await app.open('/nft/lunar-echo-027')
  const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
  await plus.click()
  await expect(page.getByTestId('quantity')).toHaveText('2')
  await expect(plus).toBeDisabled()
  await expect(page.getByText('Limite de 2 unidades para esta edição.')).toBeVisible()
})

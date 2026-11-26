import { addToCart, expect, test } from './fixtures'

test('skeletons while loading slowly', async ({ app }) => {
  const { page } = app
  await app.open('/', 'slow')
  await expect(page.getByTestId('catalog-skeleton')).toBeVisible()
  await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 10_000 })

  await page.getByRole('link', { name: 'Sage Nomad #009', exact: true }).click()
  await expect(page.getByTestId('detail-skeleton')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sage Nomad #009' })).toBeVisible({ timeout: 10_000 })

  await addToCart(page, 'emerald-ape-042')
  await page.goto('/cart')
  await expect(page.getByTestId('totals-skeleton')).toBeVisible()
  await expect(page.getByTestId('total')).toBeVisible({ timeout: 15_000 })
})

test('skeleton shimmer respects reduced motion', async ({ app }) => {
  const { page } = app
  const skeleton = page.getByTestId('catalog-skeleton').locator('[data-slot="skeleton"]').first()
  await app.open('/?q=ape', 'slow')
  await expect(skeleton).toBeVisible()
  expect(await skeleton.evaluate((node) => getComputedStyle(node).animationIterationCount)).toBe('infinite')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await app.open('/?q=ape', 'slow')
  await expect(skeleton).toBeVisible()
  const motion = await skeleton.evaluate((node) => {
    const style = getComputedStyle(node)
    return { iterations: style.animationIterationCount, duration: style.animationDuration }
  })
  expect(motion).toEqual({ iterations: '1', duration: '1e-05s' })
})

test('catalog failure with retry', async ({ app }) => {
  const { page } = app
  await app.open('/', 'flaky-catalog')
  const retry = page.getByRole('button', { name: 'Tentar novamente' })
  await expect(retry).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Serviço indisponível. Tente novamente.')).toBeVisible()
  await retry.click()
  await expect(page.getByTestId('nft-card').first()).toBeVisible()
})

test('offline shows network feedback', async ({ app }) => {
  const { page } = app
  await app.open('/', 'offline')
  await expect(page.getByText('Sem conexão com o servidor. Verifique sua rede e tente novamente.')).toBeVisible({ timeout: 15_000 })
})

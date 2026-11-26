import { expect, test } from './fixtures'

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

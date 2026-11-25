import { expect, test } from './fixtures'

test('acesso direto ao detalhe', async ({ app }) => {
  await app.open('/nft/ivory-baron-088')
  await expect(app.page.getByRole('heading', { name: 'Ivory Baron #088' })).toBeVisible()
})

test('NFT inexistente', async ({ app }) => {
  await app.open('/nft/nao-existe-999')
  await expect(app.page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
})

test('rota inexistente', async ({ app }) => {
  await app.open('/rota/que/nao/existe')
  await expect(app.page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
})

test('edição esgotada fica indisponível', async ({ app }) => {
  const { page } = app
  await app.open('/nft/onyx-relic-404')
  for (const label of ['1/1', '1/10', '1/50', 'ABERTA']) {
    await expect(page.getByRole('radio', { name: `${label} (esgotada)`, exact: true })).toBeDisabled()
  }
  await expect(page.getByRole('button', { name: /Comprar/i }).first()).toBeDisabled()
})

test('limite de quantidade por disponibilidade', async ({ app }) => {
  const { page } = app
  await app.open('/nft/lunar-echo-027')
  const plus = page.getByRole('button', { name: 'Aumentar quantidade' })
  await plus.click()
  await expect(page.getByTestId('quantity')).toHaveText('2')
  await expect(plus).toBeDisabled()
  await expect(page.getByText('Limite de 2 unidades para esta edição.')).toBeVisible()
})

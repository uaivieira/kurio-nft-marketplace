import { addToCart, expect, test } from './fixtures'

test('wallet refusal, retry and disconnect at checkout', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('wallet-refused')
  await addToCart(page, 'emerald-ape-042')
  await page.goto('/checkout')

  const connection = page.getByTestId('wallet-connection')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(connection.getByRole('alert')).toHaveText('A carteira recusou a conexão.')
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(connection.getByRole('alert')).toHaveText('Conecte a carteira selecionada para continuar.')
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toHaveCount(0)

  await backend.setScenario('default')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(connection.getByText(/Conectada:/)).toBeVisible()
  await expect(connection.getByRole('alert')).toHaveCount(0)

  await connection.getByRole('button', { name: 'Desconectar' }).click()
  await expect(connection.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(connection.getByRole('alert')).toHaveText('Conecte a carteira selecionada para continuar.')
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toHaveCount(0)
})

test('network selection updates the fee and the review', async ({ app, isMobile }) => {
  const { page } = app
  await app.login('ana')
  await addToCart(page, 'emerald-ape-042')
  await page.goto('/checkout')
  await expect(page.getByTestId('fee')).toHaveText('0.016 ETH')

  if (isMobile) await page.getByRole('button', { name: 'Dados do colecionador' }).click()
  await page.getByRole('combobox', { name: 'Rede' }).click()
  await page.getByRole('option', { name: 'Polygon' }).click()
  await expect(page.getByTestId('fee')).toHaveText('0.002 ETH')

  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conectada:/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(review).toContainText('na rede Polygon')
})

test('changing the network after connecting asks to connect again', async ({ app, isMobile }) => {
  const { page } = app
  await app.login('ana')
  await addToCart(page, 'emerald-ape-042')
  await page.goto('/checkout')
  const connection = page.getByTestId('wallet-connection')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(connection.getByText(/Conectada:/)).toBeVisible()

  if (isMobile) await page.getByRole('button', { name: 'Dados do colecionador' }).click()
  await page.getByRole('combobox', { name: 'Rede' }).click()
  await page.getByRole('option', { name: 'Polygon' }).click()
  await expect(connection.getByRole('button', { name: 'Conectar carteira' })).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(connection.getByRole('alert')).toHaveText('Conecte a carteira selecionada para continuar.')
})

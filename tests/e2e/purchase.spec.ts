import { expect, test } from './fixtures'

test('compra completa: catálogo → detalhe → carrinho → pagamento → recibo confirmado', async ({ app }) => {
  const { page } = app
  await app.login('ana')

  await page.getByRole('link', { name: 'Emerald Ape #042', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Emerald Ape #042' })).toBeVisible()
  await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()

  await expect(page).toHaveURL('/cart')
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await expect(page.getByTestId('total')).toHaveText('2.396 ETH')

  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conectada:/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await page.getByRole('button', { name: 'Enviar pedido' }).click()

  await expect(page).toHaveURL(/\/orders\//)
  await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('receipt-total')).toHaveText('2.396 ETH')
  await expect(page.getByTestId('receipt-line')).toHaveCount(1)
})

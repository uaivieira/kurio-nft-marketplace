import { addToCart, expect, test, USERS } from './fixtures'

test('quantidades, remoção e persistência após refresh', async ({ app }) => {
  const { page } = app
  await app.open('/nft/emerald-ape-042')
  await page.getByRole('button', { name: /Comprar/i }).first().click()
  await expect(page).toHaveURL('/cart')
  await expect(page.getByTestId('line-quantity')).toHaveText('1')

  await page.getByRole('button', { name: 'Aumentar quantidade de Emerald Ape #042' }).click()
  await expect(page.getByTestId('line-quantity')).toHaveText('2')
  await expect(page.getByTestId('total')).toHaveText('2.396 ETH')

  await page.reload()
  await expect(page.getByTestId('line-quantity')).toHaveText('2')

  await page.getByRole('button', { name: 'Diminuir quantidade de Emerald Ape #042' }).click()
  await expect(page.getByTestId('line-quantity')).toHaveText('1')
  await page.getByRole('button', { name: 'Remover Emerald Ape #042 do carrinho' }).click()
  await expect(page.getByTestId('cart-empty')).toBeVisible()
})

test('cupom inválido, expirado, aplicado e removido', async ({ app }) => {
  const { page } = app
  await app.open('/')
  await addToCart(page, 'emerald-ape-042', 2)
  await page.goto('/cart')
  const input = page.getByLabel('Código promocional')

  await input.fill('NAOEXISTE')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Cupom inválido.')).toBeVisible()

  await input.fill('EXPIRED5')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByText('Este cupom expirou.')).toBeVisible()

  await input.fill('kurio10')
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await expect(page.getByTestId('coupon-applied')).toContainText('KURIO10')
  await expect(page.getByTestId('discount')).toHaveText('(-) 0.238 ETH')
  await expect(page.getByTestId('total')).toHaveText('2.158 ETH')

  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(page.getByTestId('total')).toHaveText('2.396 ETH')
})

test('itens do visitante são preservados ao autenticar', async ({ app }) => {
  const { page } = app
  await app.open('/')
  await addToCart(page, 'golden-beat-207', 3)
  await page.goto('/cart')
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.bruno.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.bruno.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/checkout')
  await page.goto('/cart')
  await expect(page.getByTestId('cart-line')).toContainText('Golden Beat #207')
  await expect(page.getByTestId('line-quantity')).toHaveText('3')
})

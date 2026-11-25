import { addToCart, expect, openReview, test } from './fixtures'

test('alteração de preço no carrinho é informada e atualiza o resumo', async ({ app }) => {
  const { page, backend } = app
  await app.open('/')
  await addToCart(page, 'emerald-ape-042', 2)
  await page.goto('/cart')
  await expect(page.getByTestId('total')).toHaveText('2.396 ETH')
  await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)

  await backend.updateEdition('emerald-ape-042', 'e50', { price: '1.50' })
  await expect(page.getByTestId('cart-issues')).toContainText('O preço de Emerald Ape #042 mudou de 1.19 para 1.50 ETH')
  await expect(page.getByTestId('total')).toHaveText('3.016 ETH')
  await expect(page.getByTestId('live-region')).toContainText('Preço de Emerald Ape #042 mudou')

  await backend.updateEdition('emerald-ape-042', 'e50', { available: 1 })
  await expect(page.getByTestId('cart-issues')).toContainText('Restam apenas 1')
  await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
})

test('checkout impede confirmar com cotação desatualizada (evento Socket.IO)', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)

  await backend.updateEdition('emerald-ape-042', 'e50', { price: '1.40' })
  await expect(page.getByTestId('quote-outdated')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar pedido' })).toBeDisabled()
  await page.getByRole('button', { name: 'Atualizar valores' }).click()
  await expect(page.getByRole('dialog').getByTestId('total')).toHaveText('1.416 ETH')
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('receipt-total')).toHaveText('1.416 ETH')
})

test('preço alterado no envio exige nova confirmação (409)', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('price-change-during-checkout')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByTestId('quote-changed')).toContainText('o total era 1.206 ETH e agora é 1.325 ETH')
  await page.getByRole('button', { name: 'Confirmar com novos valores' }).click()
  await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
})

test('edição esgotada no envio fecha a revisão e mantém o carrinho', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('sold-out-during-checkout')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByText(/esgotou/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
})

test('eventos duplicados ou antigos não regridem o estado', async ({ app }) => {
  const { page, backend } = app
  await app.open('/nft/sage-nomad-009')
  await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)
  await backend.updateEdition('sage-nomad-009', 'e50', { price: '2.00' })
  await expect(page.getByTestId('detail-price')).toHaveText('2.00 ETH')
  // Record every price the UI ever shows from here on.
  await page.evaluate(() => {
    const seen: string[] = ((window as unknown as { __prices: string[] }).__prices = [])
    const node = document.querySelector('[data-testid="detail-price"]')!
    new MutationObserver(() => seen.push(node.textContent ?? '')).observe(node, { childList: true, characterData: true, subtree: true })
  })
  await backend.emitDuplicate()
  await backend.emitStale('sage-nomad-009')
  // Events arrive in order on the same socket: once this newer one shows, the two before it were processed.
  await backend.updateEdition('sage-nomad-009', 'e50', { price: '2.10' })
  await expect(page.getByTestId('detail-price')).toHaveText('2.10 ETH')
  const seen = await page.evaluate(() => (window as unknown as { __prices: string[] }).__prices)
  expect(seen).not.toContain('9.99 ETH')
  expect(seen.filter((text) => text === '2.00 ETH')).toHaveLength(0)
  await expect(page.getByRole('radio', { name: /^1\/50/ })).toBeEnabled()
})

test('desconexão com pedido pendente: reconecta e recupera sem nova compra', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('order-hold')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByTestId('order-pending')).toBeVisible()
  const [orderId] = await backend.pendingOrderIds()

  await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)
  await backend.setSocketOnline(false)
  await expect(page.getByTestId('realtime-offline')).toBeVisible()
  // Refresh during the outage: the order is recovered from REST, not recreated.
  await page.reload()
  await expect(page.getByTestId('order-pending')).toBeVisible()
  expect(await backend.pendingOrderIds()).toEqual([orderId])

  await backend.resolveOrder(orderId!, 'confirmed')
  await backend.setSocketOnline(true)
  await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-empty')).toBeVisible()
})

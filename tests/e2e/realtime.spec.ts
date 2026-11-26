import { apiFetch, addToCart, expect, openReview, test } from './fixtures'

test('a price change in the cart is announced and updates the summary', async ({ app }) => {
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

test('a stale event older than the REST data does not announce a cart change', async ({ app }) => {
  const { page, backend } = app
  await app.open('/')
  await addToCart(page, 'emerald-ape-042')
  await page.goto('/cart')
  await expect(page.getByTestId('total')).toHaveText('1.206 ETH')
  await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)
  await page.getByTestId('live-region').evaluate((region) => {
    const seen: string[] = ((window as unknown as { __announced: string[] }).__announced = [])
    new MutationObserver(() => seen.push(region.textContent ?? '')).observe(region, { childList: true, characterData: true, subtree: true })
  })

  await backend.emitStale('emerald-ape-042')
  await backend.updateEdition('emerald-ape-042', 'e50', { price: '1.50' })
  await expect(page.getByTestId('live-region')).toContainText('para 1.50 ETH')
  const announced = await page.evaluate(() => (window as unknown as { __announced: string[] }).__announced)
  expect(announced.join(' ')).not.toContain('9.99')
  await expect(page.getByTestId('cart-issues')).not.toContainText('9.99')
})

test('checkout blocks confirming a stale quote (Socket.IO event)', async ({ app }) => {
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

test('price changed on submit requires a new confirmation (409)', async ({ app }) => {
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

test('edition sold out on submit closes the review and keeps the cart', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('sold-out-during-checkout')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByText(/esgotou/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
})

test('duplicate or stale events do not roll back the state', async ({ app }) => {
  const { page, backend } = app
  await app.open('/nft/sage-nomad-009')
  await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)
  await backend.updateEdition('sage-nomad-009', 'e50', { price: '2.00' })
  await expect(page.getByTestId('detail-price')).toHaveText('2.00 ETH')
  await page.evaluate(() => {
    const seen: string[] = ((window as unknown as { __prices: string[] }).__prices = [])
    const node = document.querySelector('[data-testid="detail-price"]')!
    new MutationObserver(() => seen.push(node.textContent ?? '')).observe(node, { childList: true, characterData: true, subtree: true })
  })
  await backend.emitDuplicate()
  await backend.emitStale('sage-nomad-009')
  await backend.updateEdition('sage-nomad-009', 'e50', { price: '2.10' })
  await expect(page.getByTestId('detail-price')).toHaveText('2.10 ETH')
  const seen = await page.evaluate(() => (window as unknown as { __prices: string[] }).__prices)
  expect(seen).not.toContain('9.99 ETH')
  expect(seen.filter((text) => text === '2.00 ETH')).toHaveLength(0)
  await expect(page.getByRole('radio', { name: /^1\/50/ })).toBeEnabled()
})

test('disconnect with a pending order: reconnects and recovers without a new purchase', async ({ app }) => {
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
  await page.reload()
  await expect(page.getByTestId('order-pending')).toBeVisible()
  expect(await backend.pendingOrderIds()).toEqual([orderId])

  await backend.resolveOrder(orderId!, 'confirmed')
  await backend.setSocketOnline(true)
  await expect(page.getByTestId('order-confirmed')).toBeVisible({ timeout: 10_000 })
  await page.goto('/checkout')
  await expect(page.getByTestId('checkout-empty')).toBeVisible()
})

test('order events of the previous session do not reach the next user', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('order-hold')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByTestId('order-pending')).toBeVisible()
  const [anaOrder] = await backend.pendingOrderIds()

  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL('/')
  await app.login('bruno')
  await expect.poll(() => backend.connectedSockets()).toBe(1)

  await addToCart(page, 'emerald-ape-042')
  await page.goto('/cart')
  await expect(page.getByTestId('total')).toBeVisible()
  await expect.poll(() => backend.connectedSockets()).toBeGreaterThan(0)
  await page.getByTestId('live-region').evaluate((region) => {
    const seen: string[] = []
    Object.assign(window, { liveMessages: seen })
    new MutationObserver(() => seen.push(region.textContent ?? '')).observe(region, { childList: true, characterData: true, subtree: true })
  })

  await backend.resolveOrder(anaOrder!, 'confirmed')
  await backend.updateEdition('emerald-ape-042', 'e50', { price: '1.50' })
  await expect(page.getByTestId('live-region')).toContainText('Preço de Emerald Ape #042 mudou')
  const messages = await page.evaluate(() => (window as unknown as { liveMessages: string[] }).liveMessages)
  expect(messages.join(' ')).not.toMatch(/Pedido (confirmado|recusado|pendente)/)
  expect((await apiFetch(page, `/orders/${anaOrder}`)).status).toBe(403)
})

import { addToCart, apiFetch, expect, openReview, test } from './fixtures'

test('pagamento recusado preserva o carrinho', async ({ app }) => {
  const { page, backend } = app
  // Fake clock: the simulated network settles orders 2.5 s after creation; we skip ahead instead of waiting.
  await page.clock.install()
  await app.login('ana')
  await backend.setScenario('payment-rejected')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  await expect(page.getByTestId('order-pending')).toBeVisible()
  await page.clock.fastForward(3000)
  await expect(page.getByTestId('order-rejected')).toBeVisible()
  await expect(page.getByTestId('order-confirmed')).toHaveCount(0)
  await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
  await expect(page.getByTestId('cart-line')).toHaveCount(1)
})

test('clique repetido cria um único pedido', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('order-hold')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  const send = page.getByRole('button', { name: 'Enviar pedido' })
  await send.dblclick({ force: true }).catch(() => {})
  await send.click({ force: true, timeout: 500 }).catch(() => {})
  await expect(page.getByTestId('order-pending')).toBeVisible()
  expect(await backend.pendingOrderIds()).toHaveLength(1)
})

test('timeout após criar o pedido recupera o mesmo pedido', async ({ app }) => {
  const { page, backend } = app
  await page.clock.install()
  await app.login('ana')
  await backend.setScenario('order-timeout')
  await addToCart(page, 'emerald-ape-042')
  await openReview(page)
  await page.getByRole('button', { name: 'Enviar pedido' }).click()
  // The first response never arrives: jump past the HTTP timeout (4 s in the E2E build, 10 s by default).
  // The client resends with the same Idempotency-Key and gets back the order that was already created.
  await expect(page.getByRole('button', { name: 'Enviando…' })).toBeVisible()
  await page.clock.fastForward(10_500)
  await expect(page).toHaveURL(/\/orders\//)
  await page.clock.fastForward(3000)
  await expect(page.getByTestId('order-confirmed')).toBeVisible()
  const { body } = await apiFetch<{ items: unknown[] }>(page, '/orders?status=confirmed')
  expect(body.items).toHaveLength(1)
})

test('idempotência: mesma chave recupera o pedido; conteúdo diferente gera conflito', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.setScenario('order-hold')
  await addToCart(page, 'emerald-ape-042')
  const wallets = await apiFetch<{ primary: { id: string } }>(page, '/me/wallets')
  const connection = await apiFetch<{ id: string }>(page, '/wallets/connections', { method: 'POST', body: { walletId: wallets.body.primary.id, provider: 'metamask', network: 'ethereum' } })
  const quote = await apiFetch<{ id: string; version: string }>(page, '/quotes', { method: 'POST', body: { network: 'ethereum' } })
  const payload = {
    quoteId: quote.body.id,
    quoteVersion: quote.body.version,
    walletId: wallets.body.primary.id,
    connectionId: connection.body.id,
    network: 'ethereum',
    buyer: { displayName: 'Ana Souza', username: 'ana', profileName: 'ana', email: 'ana@kurio.test', referralCode: 'KURIO2026', ensName: 'anasouza.eth' },
  }
  const headers = { 'Idempotency-Key': 'chave-fixa-1' }
  const first = await apiFetch<{ id: string }>(page, '/orders', { method: 'POST', body: payload, headers })
  const again = await apiFetch<{ id: string }>(page, '/orders', { method: 'POST', body: payload, headers })
  expect(first.status).toBe(202)
  expect(again.body.id).toBe(first.body.id)
  const conflict = await apiFetch<{ code: string }>(page, '/orders', { method: 'POST', body: { ...payload, network: 'polygon' }, headers })
  expect(conflict.status).toBe(409)
  expect(conflict.body.code).toBe('IDEMPOTENCY_MISMATCH')
})

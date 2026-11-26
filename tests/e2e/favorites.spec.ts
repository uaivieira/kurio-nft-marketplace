import { expect, test } from './fixtures'

test('favorite persists after refresh', async ({ app }) => {
  const { page } = app
  await app.login('ana')
  await page.getByRole('button', { name: 'Favoritar Sage Nomad #009' }).click()
  await expect(page.getByRole('button', { name: 'Remover Sage Nomad #009 dos favoritos' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('live-region')).toHaveText('Sage Nomad #009 adicionado aos favoritos.')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remover Sage Nomad #009 dos favoritos' })).toBeVisible()
  await page.goto('/favorites')
  await expect(page.getByTestId('favorites-grid')).toContainText('Sage Nomad #009')
})

test('a failed mutation rolls back the optimistic update', async ({ app }) => {
  const { page, backend } = app
  await page.clock.install()
  await app.login('ana')
  await backend.setScenario('favorites-fail')
  const heart = page.getByRole('button', { name: 'Favoritar Sage Nomad #009' })
  await expect(heart).toBeVisible()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await heart.click()
  await page.clock.runFor(1)
  await expect(page.getByRole('button', { name: 'Remover Sage Nomad #009 dos favoritos' })).toBeVisible()
  await page.clock.resume()
  await expect(page.getByRole('button', { name: 'Favoritar Sage Nomad #009' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText(/Não foi possível favoritar Sage Nomad #009/).first()).toBeVisible()

  await backend.setScenario('default')
  await page.getByRole('button', { name: 'Favoritar Sage Nomad #009' }).click()
  await expect(page.getByRole('button', { name: 'Remover Sage Nomad #009 dos favoritos' })).toBeVisible()
})

test('guest is sent to login when favoriting', async ({ app }) => {
  const { page } = app
  await app.open('/')
  await page.getByRole('button', { name: 'Favoritar Sage Nomad #009' }).click()
  await expect(page).toHaveURL(/\/login\?redirect=/)
})

import { addToCart, expect, test, USERS } from './fixtures'

test('signup with validation and conflict', async ({ app }) => {
  const { page } = app
  await app.open('/signup')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(dialog.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByText('Informe o e-mail')).toBeVisible()

  await dialog.getByLabel('Nome de usuário').fill('carla')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('Secret1234')
  await dialog.getByLabel('Confirmar senha').fill('Other1234')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(dialog.getByText('As senhas não coincidem')).toBeVisible()

  await dialog.getByLabel('Confirmar senha').fill('Secret1234')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()

  await dialog.getByLabel('E-mail').fill('carla@kurio.test')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/profile')
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('carla')
})

test('invalid login shows an error', async ({ app }) => {
  const { page } = app
  await app.open('/login')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('wrong1234')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('E-mail ou senha incorretos.')
})

test('private route requires login and returns to the destination', async ({ app }) => {
  const { page } = app
  await app.open('/profile/wallets')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/profile/wallets')
})

test('session expired while browsing keeps the return path', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.expireSessions()
  await page.goto('/profile')
  await expect(page).toHaveURL(/\/login\?.*reason=expired/, { timeout: 10_000 })
  await expect(page.getByText('Sua sessão expirou. Entre novamente para retomar de onde parou.')).toBeVisible()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/profile')
})

test('session expired at checkout keeps the filled-in data', async ({ app, isMobile }) => {
  const { page, backend } = app
  await app.login('ana')
  await addToCart(page, 'emerald-ape-042')
  await page.goto('/checkout')
  const toggle = page.getByRole('button', { name: 'Dados do colecionador' })
  if (isMobile) await toggle.click()
  await page.getByLabel('Observação do colecionador (opcional)').fill('Deliver to the primary wallet')
  await backend.expireSessions()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page).toHaveURL(/\/login\?.*reason=expired/)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/checkout')
  if (isMobile) await toggle.click()
  await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Deliver to the primary wallet')
})

test('logout and user switch clear private data', async ({ app }) => {
  const { page } = app
  await app.login('ana')
  await page.getByRole('button', { name: 'Favoritar Emerald Ape #042' }).first().click()
  await expect(page.getByRole('button', { name: 'Remover Emerald Ape #042 dos favoritos' }).first()).toBeVisible()

  await page.goto('/profile')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/favorites')
  await expect(page).toHaveURL(/\/login/)

  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.bruno.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.bruno.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/favorites')
  await expect(page.getByTestId('favorites-empty')).toBeVisible()
  await page.goto('/profile')
  await expect(page.getByRole('main').getByLabel('E-mail')).toHaveValue(USERS.bruno.email)
})

test('session expires by time (8 h TTL) while browsing', async ({ app }) => {
  const { page } = app
  await page.clock.install()
  await app.login('ana')
  await page.goto('/profile')
  await expect(page.getByRole('main').getByLabel('E-mail')).toHaveValue(USERS.ana.email)
  await page.clock.fastForward(8 * 3600_000 + 1000)
  await page.getByRole('link', { name: 'Carteiras' }).click()
  await expect(page).toHaveURL(/\/login\?.*reason=expired/)
  await expect(page.getByText('Sua sessão expirou. Entre novamente para retomar de onde parou.')).toBeVisible()
})

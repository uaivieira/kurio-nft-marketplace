import { addToCart, expect, test, USERS } from './fixtures'

test('cadastro com validação e conflito', async ({ app }) => {
  const { page } = app
  await app.open('/signup')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(dialog.getByLabel('Nome de usuário')).toHaveAttribute('aria-invalid', 'true')
  await expect(dialog.getByText('Informe o e-mail')).toBeVisible()

  await dialog.getByLabel('Nome de usuário').fill('carla')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('Senha1234')
  await dialog.getByLabel('Confirmar senha').fill('Outra1234')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(dialog.getByText('As senhas não coincidem')).toBeVisible()

  await dialog.getByLabel('Confirmar senha').fill('Senha1234')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(dialog.getByText('Este e-mail já está cadastrado.')).toBeVisible()

  await dialog.getByLabel('E-mail').fill('carla@kurio.test')
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/profile')
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('carla')
})

test('login inválido mostra erro', async ({ app }) => {
  const { page } = app
  await app.open('/login')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('errada123')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('E-mail ou senha incorretos.')
})

test('rota privada exige login e retorna ao destino', async ({ app }) => {
  const { page } = app
  await app.open('/profile/wallets')
  await expect(page).toHaveURL(/\/login\?redirect=/)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/profile/wallets')
})

test('sessão expirada durante a navegação preserva o retorno', async ({ app }) => {
  const { page, backend } = app
  await app.login('ana')
  await backend.expireSessions()
  await page.goto('/profile')
  // Boot + guarded request + redirect: allow for a slower network when run against the deployment.
  await expect(page).toHaveURL(/\/login\?.*reason=expired/, { timeout: 10_000 })
  await expect(page.getByText('Sua sessão expirou. Entre novamente para retomar de onde parou.')).toBeVisible()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/profile')
})

test('sessão expirada no checkout mantém os dados preenchidos', async ({ app, isMobile }) => {
  const { page, backend } = app
  await app.login('ana')
  await addToCart(page, 'emerald-ape-042')
  await page.goto('/checkout')
  const toggle = page.getByRole('button', { name: 'Dados do colecionador' })
  if (isMobile) await toggle.click()
  await page.getByLabel('Observação do colecionador (opcional)').fill('Entregar na carteira principal')
  await backend.expireSessions()
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page).toHaveURL(/\/login\?.*reason=expired/)
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill(USERS.ana.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/checkout')
  if (isMobile) await toggle.click()
  await expect(page.getByLabel('Observação do colecionador (opcional)')).toHaveValue('Entregar na carteira principal')
})

test('logout e troca de usuário limpam dados privados', async ({ app }) => {
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

test('sessão expira pelo tempo (TTL de 8 h) durante a navegação', async ({ app }) => {
  const { page } = app
  await page.clock.install()
  await app.login('ana')
  await page.goto('/profile')
  await expect(page.getByRole('main').getByLabel('E-mail')).toHaveValue(USERS.ana.email)
  // Jump past the session TTL; the next request is answered with SESSION_EXPIRED by the mock API.
  await page.clock.fastForward(8 * 3600_000 + 1000)
  await page.getByRole('link', { name: 'Carteiras' }).click()
  await expect(page).toHaveURL(/\/login\?.*reason=expired/)
  await expect(page.getByText('Sua sessão expirou. Entre novamente para retomar de onde parou.')).toBeVisible()
})

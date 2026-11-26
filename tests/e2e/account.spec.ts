import { expect, test, USERS } from './fixtures'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test('profile: validation, conflict and persistence', async ({ app }) => {
  const { page } = app
  await app.login('ana')
  await page.goto('/profile')
  const username = page.getByLabel('Nome de usuário')
  await expect(username).toHaveValue('ana')

  await username.fill('Ana Souza')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(username).toHaveAttribute('aria-invalid', 'true')

  await username.fill('bruno')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

  await username.fill('ana_s')
  await page.getByLabel('Nome de exibição').fill('Ana S.')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(page.getByText('Perfil salvo.').first()).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome de usuário')).toHaveValue('ana_s')
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana S.')
})

test('avatar: change and remove', async ({ app }) => {
  const { page } = app
  await app.login('ana')
  await page.goto('/profile')
  await page.getByTestId('avatar-input').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: PNG })
  await expect(page.getByTestId('avatar-image')).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('avatar-image')).toBeVisible()
  await page.getByRole('button', { name: 'Remover', exact: true }).click()
  await expect(page.getByTestId('avatar-image')).toHaveCount(0)

  await page.getByTestId('avatar-input').setInputFiles({ name: 'doc.txt', mimeType: 'text/plain', buffer: Buffer.from('x') })
  await expect(page.getByText('Use uma imagem PNG, JPEG ou WebP.')).toBeVisible()
})

test('password: validation errors and effective change', async ({ app }) => {
  const { page } = app
  await app.login('ana')
  await page.goto('/profile')
  const submit = page.getByRole('button', { name: 'Alterar senha' })

  await page.getByLabel('Senha atual').fill('wrong1234')
  await page.getByLabel('Nova senha', { exact: true }).fill('NewSecret1')
  await page.getByLabel('Confirmar nova senha').fill('Different1')
  await submit.click()
  await expect(page.getByText('As senhas não coincidem')).toBeVisible()

  await page.getByLabel('Confirmar nova senha').fill('NewSecret1')
  await submit.click()
  await expect(page.getByText('Senha atual incorreta.')).toBeVisible()

  await page.getByLabel('Senha atual').fill(USERS.ana.password)
  await submit.click()
  await expect(page.getByText('Senha alterada.').first()).toBeVisible()

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL('/')
  await page.goto('/login')
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('E-mail').fill(USERS.ana.email)
  await dialog.getByLabel('Senha', { exact: true }).fill('NewSecret1')
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL('/')
})

test('wallets: validation, primary and secondary registration', async ({ app }) => {
  const { page } = app
  await app.login('bruno')
  await page.goto('/profile/wallets')
  const primary = page.locator('#primary-wallet')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByLabel('Endereço da carteira')).toHaveAttribute('aria-invalid', 'true')

  await primary.getByLabel('Nome de exibição').fill('Bruno Lima')
  await primary.getByLabel('Apelido da carteira').fill('Main')
  await primary.getByLabel('Rede').click()
  await page.getByRole('option', { name: 'Polygon' }).click()
  await primary.getByLabel('Nome do perfil').fill('bruno')
  await primary.getByLabel('Endereço da carteira').fill('0x123')
  await primary.getByLabel('Tipo de carteira').click()
  await page.getByRole('option', { name: 'MetaMask' }).click()
  await primary.getByLabel('Código de indicação').fill('BRUNO1')
  await primary.getByLabel('E-mail').fill(USERS.bruno.email)
  await primary.getByLabel('Nome ENS').fill('brunolima')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(primary.getByText(/Endereço deve começar com 0x/)).toBeVisible()

  await primary.getByLabel('Endereço da carteira').fill('0x00000000000000000000000000000000000000b1')
  await primary.getByRole('button', { name: 'Salvar carteira' }).click()
  await expect(page.getByText('Carteira principal salva.').first()).toBeVisible()

  await page.getByRole('checkbox', { name: 'Igual à carteira principal' }).click()
  await expect(page.getByTestId('secondary-same')).toBeVisible()

  await page.reload()
  await expect(page.locator('#primary-wallet').getByLabel('Endereço da carteira')).toHaveValue('0x00000000000000000000000000000000000000b1')
  await expect(page.getByTestId('secondary-same')).toBeVisible()
})

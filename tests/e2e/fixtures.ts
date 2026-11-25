import { expect, test as base, type Page } from '@playwright/test'

export const USERS = {
  ana: { email: 'ana@kurio.test', password: 'Kurio#2026', name: 'Ana Souza' },
  bruno: { email: 'bruno@kurio.test', password: 'Kurio#2026', name: 'Bruno Lima' },
} as const

type UserKey = keyof typeof USERS

/** Typed handle to the simulated backend's control surface (window.__kurio). */
export function backend(page: Page) {
  return {
    setScenario: (id: string) => page.evaluate((scenario) => window.__kurio!.setScenario(scenario), id),
    reset: () => page.evaluate(() => window.__kurio!.reset()),
    updateEdition: (nftId: string, editionId: string, patch: { price?: string; available?: number }) =>
      page.evaluate(([n, e, p]) => window.__kurio!.updateEdition(n as string, e as string, p as never), [nftId, editionId, patch] as const),
    emitDuplicate: () => page.evaluate(() => window.__kurio!.emitDuplicate()),
    emitStale: (nftId: string) => page.evaluate((id) => window.__kurio!.emitStale(id), nftId),
    dropSockets: () => page.evaluate(() => window.__kurio!.dropSockets()),
    setSocketOnline: (online: boolean) => page.evaluate((value) => window.__kurio!.setSocketOnline(value), online),
    resolveOrder: (id: string, outcome: 'confirmed' | 'rejected') => page.evaluate(([i, o]) => window.__kurio!.resolveOrder(i as string, o as 'confirmed'), [id, outcome] as const),
    pendingOrderIds: () => page.evaluate(() => window.__kurio!.pendingOrderIds()),
    expireSessions: () => page.evaluate(() => window.__kurio!.expireSessions()),
    connectedSockets: () => page.evaluate(() => window.__kurio!.connectedSockets()),
  }
}

declare global {
  interface Window {
    __kurio?: {
      setScenario: (id: string) => void
      reset: () => Promise<void>
      updateEdition: (nftId: string, editionId: string, patch: { price?: string; available?: number }) => void
      emitDuplicate: () => Promise<boolean>
      emitStale: (nftId: string) => Promise<void>
      dropSockets: () => Promise<void>
      setSocketOnline: (online: boolean) => Promise<void>
      resolveOrder: (id: string, outcome: 'confirmed' | 'rejected') => void
      pendingOrderIds: () => string[]
      expireSessions: () => void
      connectedSockets: () => Promise<number>
    }
  }
}

export const test = base.extend<{ app: { page: Page; backend: ReturnType<typeof backend>; open: (path?: string, scenario?: string) => Promise<void>; login: (user: UserKey) => Promise<void> } }>({
  app: async ({ page }, use) => {
    const api = backend(page)
    const open = async (path = '/', scenario?: string) => {
      const url = scenario ? `${path}${path.includes('?') ? '&' : '?'}scenario=${scenario}` : path
      await page.goto(url)
      await page.waitForFunction(() => Boolean(window.__kurio) && document.documentElement.hasAttribute('data-app-ready'))
    }
    const login = async (user: UserKey) => {
      await page.goto('/login')
      await page.waitForFunction(() => Boolean(window.__kurio) && document.documentElement.hasAttribute('data-app-ready'))
      const dialog = page.getByRole('dialog')
      await dialog.getByLabel('E-mail').fill(USERS[user].email)
      await dialog.getByLabel('Senha', { exact: true }).fill(USERS[user].password)
      await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
      await expect(page).toHaveURL('/')
    }
    await use({ page, backend: api, open, login })
  },
})

export { expect }

/** Fetches through MSW inside the page (same handlers the app uses). */
export function apiFetch<T = unknown>(page: Page, path: string, init?: { method?: string; body?: unknown; headers?: Record<string, string> }) {
  return page.evaluate(
    async ([url, options]) => {
      const session = JSON.parse(localStorage.getItem('kurio:session') ?? 'null') as { token: string } | null
      const response = await fetch(`/api${url}`, {
        method: options?.method ?? 'GET',
        headers: { 'content-type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : {}), ...(options?.headers ?? {}) },
        body: options?.body === undefined ? undefined : JSON.stringify(options.body),
      })
      return { status: response.status, body: response.status === 204 ? null : await response.json() }
    },
    [path, init] as const,
  ) as Promise<{ status: number; body: T }>
}

/** Adds an item to the current cart (guest or user) through the REST API. */
export async function addToCart(page: Page, nftId: string, quantity = 1, editionId = 'e50') {
  await page.evaluate(
    async ([n, q, e]) => {
      const session = JSON.parse(localStorage.getItem('kurio:session') ?? 'null') as { token: string } | null
      const guest = localStorage.getItem('kurio:guest-id') ?? crypto.randomUUID()
      localStorage.setItem('kurio:guest-id', guest)
      await fetch('/api/cart/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(session ? { Authorization: `Bearer ${session.token}` } : { 'X-Guest-Id': guest }) },
        body: JSON.stringify({ nftId: n, editionId: e, quantity: q }),
      })
    },
    [nftId, quantity, editionId] as const,
  )
}

/** Goes from the cart to the review dialog with the primary wallet connected. */
export async function openReview(page: Page) {
  await page.goto('/checkout')
  await page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(page.getByText(/Conectada:/)).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar compra' }).click()
  await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toBeVisible()
}

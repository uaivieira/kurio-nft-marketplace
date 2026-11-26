import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'
import sharp from 'sharp'

interface Frame {
  name: string
  nodeId: string
  width: number
  route: string
  setup: 'guest' | 'cart' | 'ana' | 'ana-cart' | 'ana-order'
}

const PORT = 4176
const BASE = `http://127.0.0.1:${PORT}`
const ROOT = path.resolve('figma')
const CHANNEL_TOLERANCE = 26
const FIGMA_CART: [string, number][] = [
  ['emerald-ape-042', 2],
  ['violet-nomad-314', 6],
  ['ivory-baron-088', 9],
]

async function setup(page: Page, frame: Frame): Promise<string> {
  await page.goto(`${BASE}/`)
  await page.waitForFunction(() => Boolean((window as { __kurio?: unknown }).__kurio))
  if (frame.setup === 'guest') return frame.route

  return page.evaluate(
    async ({ kind, cart, route }) => {
      const json = { 'content-type': 'application/json' }
      let auth: Record<string, string> = {}
      if (kind !== 'cart') {
        const session = await (await fetch('/api/auth/login', { method: 'POST', headers: json, body: JSON.stringify({ email: 'ana@kurio.test', password: 'Kurio#2026' }) })).json()
        localStorage.setItem('kurio:session', JSON.stringify(session))
        auth = { Authorization: `Bearer ${session.token}` }
      } else {
        const guest = crypto.randomUUID()
        localStorage.setItem('kurio:guest-id', guest)
        auth = { 'X-Guest-Id': guest }
      }
      const headers = { ...json, ...auth }
      if (kind === 'ana') return route
      for (const [nftId, quantity] of cart) {
        await fetch('/api/cart/items', { method: 'POST', headers, body: JSON.stringify({ nftId, editionId: 'e50', quantity }) })
      }
      if (kind !== 'ana-order') return route

      const wallets = await (await fetch('/api/me/wallets', { headers })).json()
      const connection = await (await fetch('/api/wallets/connections', { method: 'POST', headers, body: JSON.stringify({ walletId: wallets.primary.id, provider: 'metamask', network: 'ethereum' }) })).json()
      const quote = await (await fetch('/api/quotes', { method: 'POST', headers, body: JSON.stringify({ network: 'ethereum' }) })).json()
      const order = await (
        await fetch('/api/orders', {
          method: 'POST',
          headers: { ...headers, 'Idempotency-Key': crypto.randomUUID() },
          body: JSON.stringify({
            quoteId: quote.id,
            quoteVersion: quote.version,
            walletId: wallets.primary.id,
            connectionId: connection.id,
            network: 'ethereum',
            buyer: { displayName: 'Ana Souza', username: 'ana', profileName: 'ana', email: 'ana@kurio.test', referralCode: 'KURIO2026', ensName: 'anasouza.eth' },
          }),
        })
      ).json()
      ;(window as unknown as { __kurio: { resolveOrder: (id: string, outcome: string) => void } }).__kurio.resolveOrder(order.id, 'confirmed')
      return route.replace(':order', order.id)
    },
    { kind: frame.setup, cart: FIGMA_CART, route: frame.route },
  )
}

async function diff(expectedPath: string, actual: Buffer, outPrefix: string) {
  const expectedMeta = await sharp(expectedPath).metadata()
  const actualMeta = await sharp(actual).metadata()
  const width = expectedMeta.width!
  const height = Math.min(expectedMeta.height!, actualMeta.height!)
  const read = (input: string | Buffer) =>
    sharp(input).extract({ left: 0, top: 0, width, height }).removeAlpha().raw().toBuffer()
  const [a, b] = await Promise.all([read(expectedPath), read(actual)])

  const out = Buffer.alloc(width * height * 3)
  let different = 0
  for (let i = 0; i < width * height; i += 1) {
    const o = i * 3
    const delta = Math.max(Math.abs(a[o]! - b[o]!), Math.abs(a[o + 1]! - b[o + 1]!), Math.abs(a[o + 2]! - b[o + 2]!))
    if (delta > CHANNEL_TOLERANCE) {
      different += 1
      out[o] = 255
      out[o + 1] = 0
      out[o + 2] = 80
    } else {
      const gray = Math.round((b[o]! + b[o + 1]! + b[o + 2]!) / 3 / 3)
      out[o] = gray
      out[o + 1] = gray
      out[o + 2] = gray
    }
  }
  await sharp(out, { raw: { width, height, channels: 3 } }).png().toFile(`${outPrefix}-diff.png`)
  return { percent: (different / (width * height)) * 100, figmaHeight: expectedMeta.height!, appHeight: actualMeta.height! }
}

async function main() {
  const filter = process.argv[2]
  const frames = (JSON.parse(await readFile(path.join(ROOT, 'frames.json'), 'utf8')) as Frame[]).filter((frame) => !filter || frame.name.includes(filter))
  await mkdir(path.join(ROOT, 'report'), { recursive: true })

  const server = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  await new Promise((resolve) => setTimeout(resolve, 2500))
  const browser = await chromium.launch()
  const rows: string[] = []

  try {
    for (const frame of frames) {
      const expectedPath = path.join(ROOT, 'frames', `${frame.name}.png`)
      const { height } = await sharp(expectedPath).metadata()
      const context = await browser.newContext({ viewport: { width: frame.width, height: Math.min(height!, 1200) }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
      const page = await context.newPage()
      const route = await setup(page, frame)
      await page.goto(`${BASE}${route}`)
      await page.waitForLoadState('networkidle')
      if (frame.setup === 'ana-order') await page.getByTestId('order-confirmed').waitFor({ timeout: 10_000 })
      await page.addStyleTag({ content: '[aria-label="Painel de cenários simulados"]{display:none!important}' })
      await page.waitForTimeout(300)
      const actual = await page.screenshot({ fullPage: true, animations: 'disabled' })
      const prefix = path.join(ROOT, 'report', frame.name)
      await writeFile(`${prefix}-actual.png`, actual)
      const result = await diff(expectedPath, actual, prefix)
      rows.push(`| ${frame.name} | \`${frame.nodeId}\` | ${result.percent.toFixed(2)}% | ${result.figmaHeight} | ${result.appHeight} |`)
      console.log(`${frame.name.padEnd(22)} ${result.percent.toFixed(2).padStart(6)}%  figma ${result.figmaHeight}px  app ${result.appHeight}px`)
      await context.close()
    }
  } finally {
    await browser.close()
    server.kill()
  }

  const summary = `# Figma comparison\n\nGerado por \`pnpm figma:compare\` em ${new Date().toISOString()}. Diferença = pixels com variação acima de ${CHANNEL_TOLERANCE}/255 em algum canal, na área comum (largura do frame × menor altura).\n\n| Frame | Node | Difference | Figma height | App height |\n|---|---|---|---|---|\n${rows.join('\n')}\n`
  await writeFile(path.join(ROOT, 'report', 'summary.md'), summary)
}

await main()

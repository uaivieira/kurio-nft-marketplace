import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'
import sharp from 'sharp'

interface Frame {
  name: string
  nodeId: string
  width: number
  route: string
  setup: 'guest' | 'cart' | 'ana' | 'ana-cart' | 'ana-order'
  cart?: [string, number][]
  fill?: [string, string][]
}

const PORT = 4176
const BASE = `http://127.0.0.1:${PORT}`
const ROOT = path.resolve('figma')
const CHANNEL_TOLERANCE = 26
const INK_TOLERANCE = 30
const GEOMETRY_TOLERANCE = 2
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
    { kind: frame.setup, cart: frame.cart ?? FIGMA_CART, route: frame.route },
  )
}

interface GeometryElement {
  id: string
  selector: string
  measure: 'box' | 'ink'
  x: number
  y: number
  w: number
  h: number
  tolerance?: number
  relativeTo?: { id: string; edge: 'top' | 'bottom' }
  anchorOnly?: boolean
  ignore?: ('x' | 'y' | 'w' | 'h')[]
  font?: { size?: number; weight?: number; lineHeight?: number }
}

interface GeometryFile {
  frame: string
  source: string
  elements: GeometryElement[]
}

interface Box {
  x: number
  y: number
  w: number
  h: number
}

async function readGeometry(frame: Frame): Promise<GeometryFile | null> {
  const file = path.join(ROOT, 'nodes', `${frame.name}.json`)
  try {
    await access(file)
  } catch {
    return null
  }
  return JSON.parse(await readFile(file, 'utf8')) as GeometryFile
}

async function inkBox(image: Buffer, origin: Box): Promise<Box | null> {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const at = (x: number, y: number) => (y * info.width + x) * 3
  const counts = new Map<number, number>()
  for (let x = 0; x < info.width; x += 1) {
    for (const y of [0, info.height - 1]) {
      const o = at(x, y)
      const key = (data[o]! << 16) | (data[o + 1]! << 8) | data[o + 2]!
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const background = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0
  const bg = [(background >> 16) & 255, (background >> 8) & 255, background & 255]
  let minX = Infinity
  let minY = Infinity
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const o = at(x, y)
      const delta = Math.max(Math.abs(data[o]! - bg[0]!), Math.abs(data[o + 1]! - bg[1]!), Math.abs(data[o + 2]! - bg[2]!))
      if (delta <= INK_TOLERANCE) continue
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  return maxX < 0 ? null : { x: origin.x + minX, y: origin.y + minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

async function checkGeometry(page: Page, geometry: GeometryFile) {
  const failures: string[] = []
  const measured = new Map<string, Box>()
  const reference = new Map(geometry.elements.map((element) => [element.id, element]))
  for (const element of geometry.elements) {
    const locator = page.locator(element.selector).first()
    await page.evaluate(() => window.scrollTo(0, 0))
    const found = await locator.evaluate((node) => {
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return {
        box: { x: rect.left + window.scrollX, y: rect.top + window.scrollY, w: rect.width, h: rect.height },
        font: { size: parseFloat(style.fontSize), weight: Number(style.fontWeight), lineHeight: style.lineHeight === 'normal' ? 0 : parseFloat(style.lineHeight) },
      }
    }, undefined, { timeout: 5_000 }).catch(() => null)
    if (!found) {
      failures.push(`${element.id}: not found (${element.selector})`)
      continue
    }
    const actual = element.measure === 'ink' ? await inkBox(await locator.screenshot({ animations: 'disabled' }), found.box) : found.box
    if (!actual) {
      failures.push(`${element.id}: no ink inside ${JSON.stringify(found.box)}`)
      continue
    }
    measured.set(element.id, actual)
    if (element.anchorOnly) continue
    const anchor = element.relativeTo
    const anchorActual = anchor ? measured.get(anchor.id) : undefined
    const anchorFigma = anchor ? reference.get(anchor.id) : undefined
    if (anchor && (!anchorActual || !anchorFigma)) {
      failures.push(`${element.id}: anchor ${anchor.id} not measured`)
      continue
    }
    const edge = (box: Box) => (anchor?.edge === 'bottom' ? box.y + box.h : box.y)
    const shiftY = anchorActual && anchorFigma ? edge(anchorActual) - edge(anchorFigma) : 0
    const expected = { x: element.x, y: element.y + shiftY, w: element.w, h: element.h }
    const tolerance = element.tolerance ?? GEOMETRY_TOLERANCE
    const deltas = (['x', 'y', 'w', 'h'] as const).filter((key) => !element.ignore?.includes(key)).map((key) => [key, Math.round(actual[key] - expected[key])] as const).filter(([, delta]) => Math.abs(delta) > tolerance)
    const fontIssues = (['size', 'weight', 'lineHeight'] as const)
      .filter((key) => element.font?.[key] !== undefined && Math.abs(found.font[key] - element.font[key]!) > 0.5)
      .map((key) => `${key} ${found.font[key]} (figma ${element.font![key]})`)
    const geometryText = `x ${Math.round(actual.x)} y ${Math.round(actual.y)} w ${Math.round(actual.w)} h ${Math.round(actual.h)}`
    if (deltas.length || fontIssues.length) {
      const anchorText = anchor ? ` (y relative to ${anchor.id} ${anchor.edge}, shift ${Math.round(shiftY)})` : ''
      failures.push(`${element.id}: ${geometryText} vs figma x ${element.x} y ${element.y} w ${element.w} h ${element.h}${anchorText}; ${[...deltas.map(([key, delta]) => `${key} ${delta > 0 ? '+' : ''}${delta}`), ...fontIssues].join(', ')}`)
    }
  }
  return failures
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
  const geometryMode = process.argv.includes('--geometry')
  const filter = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  const frames = (JSON.parse(await readFile(path.join(ROOT, 'frames.json'), 'utf8')) as Frame[]).filter((frame) => !filter || frame.name.includes(filter))
  await mkdir(path.join(ROOT, 'report'), { recursive: true })

  const server = spawn('pnpm', ['exec', 'vite', 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
  await new Promise((resolve) => setTimeout(resolve, 2500))
  const browser = await chromium.launch()
  const rows: string[] = []
  const geometryRows: string[] = []
  let geometryFailures = 0

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
      for (const [selector, value] of frame.fill ?? []) await page.locator(selector).fill(value)
      await page.addStyleTag({ content: '[aria-label="Painel de cenários simulados"]{display:none!important}' })
      await page.waitForTimeout(300)
      if (geometryMode) {
        const geometry = await readGeometry(frame)
        if (geometry) {
          const failures = await checkGeometry(page, geometry)
          geometryFailures += failures.length
          const checked = geometry.elements.filter((element) => !element.anchorOnly).length
          geometryRows.push(`| ${frame.name} | ${checked - failures.length}/${checked} |`)
          console.log(`${frame.name.padEnd(22)} ${checked - failures.length}/${checked} elements within tolerance`)
          for (const failure of failures) console.log(`  ✗ ${failure}`)
        }
        await context.close()
        continue
      }
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

  if (geometryMode) {
    await writeFile(path.join(ROOT, 'report', 'geometry.md'), `# Figma geometry\n\nGerado por \`pnpm figma:geometry\`. Cada elemento de \`figma/nodes/<frame>.json\` precisa ficar a ±${GEOMETRY_TOLERANCE}px do Figma em x, y, largura e altura, e com a mesma tipografia quando declarada.\n\n| Frame | Elementos dentro da tolerância |\n|---|---|\n${geometryRows.join('\n')}\n`)
    if (geometryFailures > 0) process.exitCode = 1
    return
  }

  const summary = `# Figma comparison\n\nGerado por \`pnpm figma:compare\` em ${new Date().toISOString()}. Diferença = pixels com variação acima de ${CHANNEL_TOLERANCE}/255 em algum canal, na área comum (largura do frame × menor altura).\n\n| Frame | Node | Difference | Figma height | App height |\n|---|---|---|---|---|\n${rows.join('\n')}\n`
  await writeFile(path.join(ROOT, 'report', 'summary.md'), summary)
}

await main()

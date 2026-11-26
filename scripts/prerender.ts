/**
 * Writes static HTML for the public entry pages (home, marketplace and every NFT detail) into dist/.
 *
 * Each page gets the prerendered markup in #root, the dehydrated query cache, and a loader that
 * fetches the app bundle once the LCP image has been painted (the page is already complete and
 * visible), with a 1.5 s ceiling, or immediately on the first user interaction.
 * Any other path served with this HTML (SPA fallback, or the home with catalog filters in the URL)
 * is marked stale before first paint: the prerendered markup stays hidden and the app loads at once.
 * Inline scripts are byte-identical on every page and allowed by hash in the CSP (see scripts/csp.ts);
 * the build fails if vercel.json does not allow one of them.
 *
 * Run by `pnpm build` after the client and SSR builds.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { cspDirective, cspHash, executableInlineScripts, LOADER_SCRIPT, securityHeaders, STALE_CHECK_SCRIPT } from './csp'

// Optional argument: the client build directory (the E2E suite builds into dist-e2e).
const DIST = path.resolve(process.argv[2] ?? 'dist')
const SSR_DIR = path.resolve('dist-ssr')

interface PrerenderModule {
  seed: () => Promise<string[]>
  prerender: (url: string) => Promise<{ html: string; state: { queries: Array<{ queryKey: unknown[]; state: { data: unknown } }> } }>
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

function artworkPreload(artwork: string, sizes: string) {
  const set = [160, 320, 480].map((width) => `/nft/${artwork}-${width}.avif ${width}w`).join(', ')
  return `<link rel="preload" as="image" type="image/avif" imagesrcset="${set}" imagesizes="${sizes}" fetchpriority="high" />`
}

async function main() {
  const template = await readFile(path.join(DIST, 'index.html'), 'utf8')
  const entry = template.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1]
  if (!entry) throw new Error('Entry script not found in dist/index.html')
  const preloads = [...template.matchAll(/<link rel="modulepreload"[^>]*href="([^"]+)"[^>]*>/g)].map((match) => match[1]!)
  const base = template
    .replace(/\s*<script type="module" crossorigin src="[^"]+"><\/script>/, '')
    .replace(/\s*<link rel="modulepreload"[^>]*>/g, '')
    // The home's preload stays in the shared template; detail pages swap in their own artwork below.
    .replace(/\s*<link rel="preload" as="image"[^>]*>/, '\n    <!--lcp-preload-->')

  const mod = (await import(pathToFileURL(path.join(SSR_DIR, 'entry-prerender.js')).href)) as PrerenderModule
  const ids = await mod.seed()
  const routes = ['/', '/mercado', ...ids.map((id) => `/nft/${id}`)]
  const allowed = new Set(cspDirective(securityHeaders()['Content-Security-Policy'] ?? '', 'script-src'))
  const missing = new Set<string>()

  for (const route of routes) {
    const { html, state } = await mod.prerender(route)
    const detail = state.queries.find((query) => query.queryKey[0] === 'nft')?.state.data as { artwork?: string } | undefined
    const preload = detail?.artwork
      ? artworkPreload(detail.artwork, '(min-width: 768px) 404px, 100vw')
      : artworkPreload('emerald', '(min-width: 1024px) 450px, 45vw')

    const head = `<script>${STALE_CHECK_SCRIPT}</script>
    <style>[data-prerender-stale] #root{visibility:hidden}</style>
    ${preload}`
    // Per-page data goes in non-executable JSON blocks, so the executable scripts stay byte-identical.
    const loader = `<script type="application/json" id="kurio-state">${json(state)}</script>
    <script type="application/json" id="kurio-boot">${json({ entry, preloads })}</script>
    <script>${LOADER_SCRIPT}</script>`

    const page = base
      .replace('<html lang="pt-BR">', `<html lang="pt-BR" data-prerender-path="${attribute(route)}">`)
      .replace('<!--lcp-preload-->', head)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>\n    ${loader}`)
    if (!page.includes('data-prerender-path=')) throw new Error('<html lang="pt-BR"> not found in dist/index.html')
    for (const script of executableInlineScripts(page)) if (!allowed.has(cspHash(script))) missing.add(cspHash(script))
    // `/mercado` → dist/mercado.html and `/nft/<id>` → dist/nft/<id>.html: served for the extensionless
    // URL by vite preview (sirv) and by Vercel rewrites.
    const file = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, `${route}.html`)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, page)
  }

  await rm(SSR_DIR, { recursive: true, force: true })
  if (missing.size) {
    throw new Error(`vercel.json Content-Security-Policy does not allow these inline scripts; add to script-src: ${[...missing].join(' ')}`)
  }
  console.log(`prerendered ${routes.length} pages`)
}

main().then(
  // The query cache keeps GC timers alive; the work is done.
  () => process.exit(0),
  (error: unknown) => {
    console.error(error)
    process.exit(1)
  },
)

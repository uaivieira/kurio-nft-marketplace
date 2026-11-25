/**
 * Writes static HTML for the public entry pages (home and every NFT detail) into dist/.
 *
 * Each page gets the prerendered markup in #root, the dehydrated query cache, and a loader that
 * fetches the app bundle once the LCP image has been painted (the page is already complete and
 * visible), with a 1.5 s ceiling.
 * Any other path served with this HTML (SPA fallback, or the home with catalog filters in the URL)
 * is marked stale before first paint: the prerendered markup stays hidden and the app loads at once.
 *
 * Run by `pnpm build` after the client and SSR builds.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

// Optional argument: the client build directory (the E2E suite builds into dist-e2e).
const DIST = path.resolve(process.argv[2] ?? 'dist')
const SSR_DIR = path.resolve('dist-ssr')

interface PrerenderModule {
  seed: () => Promise<string[]>
  prerender: (url: string) => Promise<{ html: string; state: { queries: Array<{ queryKey: unknown[]; state: { data: unknown } }> } }>
}

const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')

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
  const routes = ['/', ...ids.map((id) => `/nft/${id}`)]

  for (const route of routes) {
    const { html, state } = await mod.prerender(route)
    const detail = state.queries.find((query) => query.queryKey[0] === 'nft')?.state.data as { artwork?: string } | undefined
    const preload = detail?.artwork
      ? artworkPreload(detail.artwork, '(min-width: 768px) 404px, 100vw')
      : artworkPreload('emerald', '(min-width: 1024px) 450px, 45vw')

    const head = `<script>(function(){var p=location.pathname.replace(/\\/$/,'')||'/';if(p!==${json(route)}||location.search)document.documentElement.setAttribute('data-prerender-stale','')})()</script>
    <style>[data-prerender-stale] #root{visibility:hidden}</style>
    ${preload}`
    const loader = `<script>window.__KURIO_STATE__=${json(state)};window.__KURIO_PRERENDER_PATH__=${json(route)}</script>
    <script>(function(){var src=${json(entry)},pre=${json(preloads)},done=false;function go(){if(done)return;done=true;pre.forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.crossOrigin='';l.href=h;document.head.appendChild(l)});var s=document.createElement('script');s.type='module';s.crossOrigin='';s.src=src;document.head.appendChild(s)}if(document.documentElement.hasAttribute('data-prerender-stale'))return go();setTimeout(go,1500);try{var po=new PerformanceObserver(function(list){list.getEntries().forEach(function(e){if(e.element&&e.element.tagName==='IMG'){po.disconnect();setTimeout(go,0)}})});po.observe({type:'largest-contentful-paint',buffered:true})}catch(err){go()}})()</script>`

    const page = base
      .replace('<!--lcp-preload-->', head)
      .replace('<div id="root"></div>', `<div id="root">${html}</div>\n    ${loader}`)
    // `/nft/<id>` → dist/nft/<id>.html: served for the extensionless URL by vite preview (sirv) and by Vercel (cleanUrls).
    const file = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, `${route}.html`)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, page)
  }

  await rm(SSR_DIR, { recursive: true, force: true })
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

/**
 * Build-time prerendering of the public entry pages (home, marketplace and every NFT detail).
 *
 * Runs in Node (vite build --ssr). The simulated backend is seeded in memory and queried
 * directly through its domain functions (no HTTP), the results go through the same Zod
 * contracts, and the page is rendered with the real router and components. The browser then
 * takes over the static HTML with the same data already in its query cache.
 */
import { dehydrate, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { catalogPage, nftDetail } from '@/contracts/nft'
import { queryClient } from '@/lib/query-client'
import { resetDb, db } from '@/mocks/db/state'
import { getNftDetail, queryCatalog } from '@/mocks/domain/catalog'
import { keys } from '@/queries/keys'
import { createAppRouter } from './router'

export async function seed() {
  await resetDb()
  return Object.keys(db.nfts)
}

export async function prerender(url: string) {
  queryClient.clear()
  // Default catalog: the content of `/` and `/mercado`.
  queryClient.setQueryData(keys.catalog({}), catalogPage.parse(queryCatalog({})))
  const match = url.match(/^\/nft\/([^/?#]+)$/)
  if (match) queryClient.setQueryData(keys.nft(match[1]!), nftDetail.parse(getNftDetail(match[1]!)))

  const router = createAppRouter(createMemoryHistory({ initialEntries: [url] }))
  await router.load()
  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { html, state: dehydrate(queryClient) }
}

import { dehydrate, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import '@/i18n'
import { cart } from '@/contracts/cart'
import { catalogPage, nftDetail } from '@/contracts/nft'
import { queryClient } from '@/lib/query-client'
import { resetDb, db } from '@/mocks/db/state'
import { viewCart } from '@/mocks/domain/cart'
import { getNftDetail, queryCatalog } from '@/mocks/domain/catalog'
import { keys } from '@/queries/keys'
import { createAppRouter } from './router'

export async function seed() {
  await resetDb()
  return Object.keys(db.nfts)
}

export async function prerender(url: string) {
  queryClient.clear()
  queryClient.setQueryData(keys.catalog({}), catalogPage.parse(queryCatalog({})))
  const match = url.match(/^\/nft\/([^/?#]+)$/)
  if (match) queryClient.setQueryData(keys.nft(match[1]!), nftDetail.parse(getNftDetail(match[1]!)))
  if (url === '/cart') {
    queryClient.setQueryData(keys.cart('guest'), cart.parse(viewCart({ id: 'cart_guest', lines: [], couponCode: null, version: 0 }, 'guest')))
    queryClient.setQueryData(keys.catalog({ page: 2 }), catalogPage.parse(queryCatalog({ page: 2 })))
  }

  const router = createAppRouter(createMemoryHistory({ initialEntries: [url] }))
  await router.load()
  const html = renderToString(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { html, state: dehydrate(queryClient) }
}

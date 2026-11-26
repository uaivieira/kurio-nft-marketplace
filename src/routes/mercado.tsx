import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/catalog/HomePage'
import { catalogSearch } from '@/features/catalog/search'
import { queryClient } from '@/lib/query-client'
import { catalogQueryOptions } from '@/queries/catalog'

/** Marketplace page: the catalog composition seen behind the Figma login/signup frames. */
export const Route = createFileRoute('/mercado')({
  validateSearch: catalogSearch,
  loaderDeps: ({ search }) => search,
  // Prefetch only: errors surface through the component's own query state (retry, empty, error UI).
  loader: ({ deps }) => {
    void queryClient.prefetchQuery(catalogQueryOptions(deps))
  },
  component: Marketplace,
})

function Marketplace() {
  const search = Route.useSearch()
  return <HomePage search={search} variant="market" />
}

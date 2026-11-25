import { createFileRoute } from '@tanstack/react-router'
import { DetailPage } from '@/features/nft/DetailPage'
import { queryClient } from '@/lib/query-client'
import { nftQueryOptions } from '@/queries/catalog'

export const Route = createFileRoute('/nft/$nftId')({
  loader: ({ params }) => {
    void queryClient.prefetchQuery(nftQueryOptions(params.nftId))
  },
  component: NftRoute,
})

function NftRoute() {
  const { nftId } = Route.useParams()
  return <DetailPage nftId={nftId} />
}

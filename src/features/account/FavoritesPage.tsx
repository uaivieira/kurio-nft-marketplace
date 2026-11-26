import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { MobileNav } from '@/components/layout/MobileNav'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard } from '@/features/catalog/NftCard'
import { nftQueryOptions } from '@/queries/catalog'
import { useFavorites } from '@/queries/favorites'

export function FavoritesPage() {
  const { t } = useTranslation()
  const favorites = useFavorites()
  const ids = favorites.data?.nftIds ?? []
  const details = useQueries({ queries: ids.map((id) => nftQueryOptions(id)) })

  return (
    <div className="mx-auto max-w-page px-5 pt-8 pb-28">
      <h1 className="mb-6 text-2xl font-bold">{t('common.favoritesList')}</h1>
      {favorites.isPending ? (
        <div role="status" aria-busy="true" aria-label={t('favorites.loading')} className="grid grid-cols-2 gap-5 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : ids.length === 0 ? (
        <div className="space-y-3 bg-card p-10 text-center" data-testid="favorites-empty">
          <p className="font-bold">{t('favorites.empty')}</p>
          <Link to="/" hash="catalogo" className={buttonVariants()}>{t('common.exploreNfts')}</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-5 md:grid-cols-4" data-testid="favorites-grid">
          {details.map((query, index) => (
            <li key={ids[index]}>{query.data ? <NftCard nft={query.data} sizes="260px" /> : <Skeleton className="aspect-square" />}</li>
          ))}
        </ul>
      )}
      <MobileNav />
    </div>
  )
}

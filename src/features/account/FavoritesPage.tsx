import { useQueries } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { MobileNav } from '@/components/layout/MobileNav'
import { RefreshGlyph } from '@/components/icons/glyphs'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NftCard } from '@/features/catalog/NftCard'
import { errorMessage } from '@/lib/api-error'
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
      {favorites.isError && !favorites.data ? (
        <div role="alert" className="flex flex-col items-center gap-3 bg-card px-5 py-16 text-center" data-testid="favorites-error">
          <p className="font-bold">{t('favorites.loadError')}</p>
          <p className="text-sm text-muted-foreground">{errorMessage(favorites.error)}</p>
          <Button onClick={() => void favorites.refetch()}><RefreshGlyph aria-hidden="true" /> {t('common.tryAgain')}</Button>
        </div>
      ) : favorites.isPending ? (
        <div role="status" aria-busy="true" aria-label={t('favorites.loading')} className="grid grid-cols-2 gap-5 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square" />)}</div>
      ) : ids.length === 0 ? (
        <div className="space-y-3 bg-card p-10 text-center" data-testid="favorites-empty">
          <p className="font-bold">{t('favorites.empty')}</p>
          <Link to="/" hash="catalogo" className={buttonVariants()}>{t('common.exploreNfts')}</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-5 md:grid-cols-4" data-testid="favorites-grid">
          {details.map((query, index) => (
            <li key={ids[index]}>
              {query.data ? (
                <NftCard nft={query.data} sizes="260px" />
              ) : query.isError ? (
                <div role="alert" className="flex aspect-square flex-col items-center justify-center gap-2 rounded-sm bg-card p-3 text-center text-sm">
                  <p>{t('favorites.itemError')}</p>
                  <Button size="sm" variant="outline" onClick={() => void query.refetch()}>{t('common.tryAgain')}</Button>
                </div>
              ) : (
                <Skeleton className="aspect-square" />
              )}
            </li>
          ))}
        </ul>
      )}
      <MobileNav />
    </div>
  )
}

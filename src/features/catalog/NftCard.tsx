import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { HeartFilledIcon, HeartIcon } from '@/components/icons'
import { useTranslation } from 'react-i18next'
import type { NftSummary } from '@/contracts/nft'
import { NftImage } from '@/components/NftImage'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { useSession } from '@/lib/session-store'
import { cn } from '@/lib/utils'
import { useFavorites, useToggleFavorite } from '@/queries/favorites'

export function FavoriteButton({ nft, className, showLabel = false }: { nft: Pick<NftSummary, 'id' | 'name'>; className?: string; showLabel?: boolean }) {
  const { t } = useTranslation()
  const session = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const { data } = useFavorites()
  const toggle = useToggleFavorite()
  const active = Boolean(data?.nftIds.includes(nft.id))

  const onClick = () => {
    if (!session) {
      void navigate({ to: '/login', search: { redirect: location.href } })
      return
    }
    toggle.mutate({ nftId: nft.id, favorite: !active, name: nft.name })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? t('catalog.favorite.remove', { name: nft.name }) : t('catalog.favorite.add', { name: nft.name })}
      className={cn('relative z-10 flex size-9 cursor-pointer items-center justify-center rounded-sm bg-card/90 text-primary transition-[background-color,transform] duration-200 hover:bg-card active:scale-90', className)}
    >
      {active ? <HeartFilledIcon className="size-5" /> : <HeartIcon className="size-5" />}
      {showLabel && <span aria-hidden="true">{active ? t('catalog.favorite.active') : t('catalog.favorite.inactive')}</span>}
    </button>
  )
}

export function NftCard({ nft, sizes = '(min-width: 1024px) 250px, 45vw', priority = false }: { nft: NftSummary; sizes?: string; priority?: boolean }) {
  const { t } = useTranslation()
  const soldOut = nft.totalAvailable === 0
  return (
    <article className="group relative flex flex-col max-md:rounded-2xl max-md:bg-card max-md:p-1.5 max-md:pb-3" data-testid="nft-card">
      <div className="relative flex aspect-[258/300] items-center justify-center overflow-hidden bg-card px-1 max-md:aspect-square max-md:px-0">
        <NftImage artwork={nft.artwork} alt={t('common.artOf', { name: nft.name })} sizes={sizes} priority={priority} className="rounded-2xl transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
        {nft.badge && <span className="absolute top-6 left-0 bg-primary px-3 py-1 text-base font-medium text-primary-foreground uppercase">{t('catalog.card.rare')}</span>}
        {soldOut && <span className="absolute bottom-6 left-1 bg-background/90 px-2 py-1 text-xs font-bold uppercase">{t('catalog.card.soldOut')}</span>}
        <FavoriteButton nft={nft} className="absolute top-8 right-4 transition-opacity duration-200 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:aria-pressed:opacity-100" />
      </div>
      <h3 className="mt-3 text-base leading-4 max-md:mt-2.5 max-md:px-1.5 max-md:text-md">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="transition-colors duration-200 after:absolute after:inset-0 hover:text-highlight">
          {nft.name}
        </Link>
      </h3>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-base leading-4 font-bold text-highlight max-md:mt-1 max-md:px-1.5 max-md:text-md">
        <span data-testid="nft-price" className="whitespace-nowrap">{formatEth(nft.price)}</span>
        {nft.compareAtPrice && (
          <span className="font-normal whitespace-nowrap text-muted-foreground line-through">
            <span className="sr-only">{`${t('catalog.card.previousPrice')} `}</span>
            {formatEth(nft.compareAtPrice)}
          </span>
        )}
      </p>
    </article>
  )
}

export function NftCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-[258/300] w-full rounded-none" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/3" />
    </div>
  )
}

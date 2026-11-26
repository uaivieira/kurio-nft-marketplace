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

const CARD_SIZES = {
  default: { frame: 'px-1', image: 'rounded-[15px]', title: 'mt-3 text-base', price: 'mt-3 text-lg' },
  compact: { frame: 'px-[3.5px]', image: 'rounded-[17px]', title: 'mt-2.5 text-md', price: 'mt-2.5 text-base' },
  related: { frame: 'px-[3.5px]', image: 'rounded-[13px]', title: 'mt-[15px] text-md', price: 'mt-[3px] text-base' },
} as const

export function NftCard({ nft, sizes = '(min-width: 1024px) 250px, 45vw', priority = false, size = 'default' }: { nft: NftSummary; sizes?: string; priority?: boolean; size?: keyof typeof CARD_SIZES }) {
  const { t } = useTranslation()
  const soldOut = nft.totalAvailable === 0
  const variant = CARD_SIZES[size]
  return (
    <article className="group relative flex flex-col" data-testid="nft-card">
      <div className={cn('relative flex aspect-[258/300] items-center justify-center overflow-hidden bg-card max-md:aspect-[175/200] max-md:items-start max-md:rounded-[20px] max-md:bg-tile max-md:px-1 max-md:pt-3', variant.frame)}>
        <NftImage artwork={nft.artwork} alt={t('common.artOf', { name: nft.name })} sizes={sizes} priority={priority} className={cn('transition-transform duration-500 ease-out group-hover:scale-[1.03] max-md:aspect-square max-md:rounded-2xl', variant.image)} />
        {nft.badge && <span className="absolute top-6 left-0 bg-primary px-3 py-1 text-base font-medium text-primary-foreground uppercase max-md:top-4 max-md:flex max-md:h-8 max-md:w-[68px] max-md:items-center max-md:py-0 max-md:pl-2 max-md:text-[13px]">{t('catalog.card.rare')}</span>}
        {soldOut && <span className="absolute bottom-6 left-1 bg-background/90 px-2 py-1 text-xs font-bold uppercase">{t('catalog.card.soldOut')}</span>}
        <FavoriteButton nft={nft} className="absolute top-8 right-4 max-md:top-3 max-md:right-2.5 max-md:size-7 max-md:rounded-full max-md:border max-md:border-border max-md:bg-elevated max-md:[&_svg]:size-4 transition-opacity duration-200 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100 md:aria-pressed:opacity-100" />
      </div>
      <h3 className={cn('leading-4 max-md:mt-2.5 max-md:px-2 max-md:text-md', variant.title)}>
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="transition-colors duration-200 after:absolute after:inset-0 hover:text-highlight">
          {nft.name}
        </Link>
      </h3>
      <p className={cn('flex flex-wrap items-baseline gap-x-3 leading-4 font-bold text-highlight max-md:mt-0.5 max-md:px-2 max-md:text-base max-md:leading-4', variant.price)}>
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
      <Skeleton className="aspect-[258/300] w-full rounded-none max-md:aspect-[175/200] max-md:rounded-2xl" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-3 h-4 w-1/3" />
    </div>
  )
}

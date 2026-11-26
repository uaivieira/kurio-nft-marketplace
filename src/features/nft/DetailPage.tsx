import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { CartIcon, LinkedinIcon, MessageIcon, SearchIcon, StarIcon, XBrandIcon } from '@/components/icons'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { interpolate } from '@/i18n/interpolate'
import { notify } from '@/lib/notify'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { NftImage } from '@/components/NftImage'
import { NftCarousel } from '@/features/catalog/NftCarousel'
import { QuantityStepper } from '@/components/QuantityStepper'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Edition, NftDetail } from '@/contracts/nft'
import { FavoriteButton } from '@/features/catalog/NftCard'
import { errorMessage, isApiError } from '@/lib/api-error'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { useReveal } from '@/lib/use-reveal'
import { announce } from '@/realtime/announcer'
import { useAddToCart } from '@/queries/cart'
import { useNft } from '@/queries/catalog'
import { NotFound } from '@/components/layout/NotFound'

const defaultEdition = (editions: Edition[]) => editions.find((edition) => edition.id === 'e50' && edition.available > 0) ?? editions.find((edition) => edition.available > 0) ?? editions[0]!

export function DetailSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" aria-label={t('detail.loading')} data-testid="detail-skeleton" className="mx-auto min-h-dvh max-w-page px-5 pt-5">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:gap-x-7 xl:grid-cols-[573px_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-6 xl:h-[448px] xl:w-[573px] xl:grid-cols-[100px_448px] xl:gap-x-[25px] xl:gap-y-0">
          <div className="hidden gap-4 xl:grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="size-[100px]" />)}</div>
          <Skeleton className="aspect-square w-full xl:size-[448px]" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} className={cn('size-3 xl:size-[15px]', i <= Math.round(rating) ? 'text-primary' : 'text-muted-foreground')} />)}
    </span>
  )
}

function Purchase({ nft, edition, onEditionChange }: { nft: NftDetail; edition: Edition; onEditionChange: (id: string) => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const addToCart = useAddToCart()
  const [requested, setQuantity] = useState(1)
  const limit = Math.min(edition.available, edition.maxPerOrder)
  const soldOut = edition.available === 0
  const quantity = Math.max(1, Math.min(requested, limit || 1))
  const lastPrice = useRef(edition.price)

  useEffect(() => {
    if (lastPrice.current !== edition.price) {
      announce(i18n.t('realtime.editionPriceChanged', { edition: edition.label, price: formatEth(edition.price) }))
      lastPrice.current = edition.price
    }
  }, [edition.price, edition.label])

  const submit = (goToCart: boolean) =>
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          announce(t('realtime.addedToCart', { quantity, name: nft.name }))
          if (goToCart) void navigate({ to: '/cart' })
          else notify.success(t('detail.addedToCart', { name: nft.name }))
        },
        onError: (error) => notify.error(errorMessage(error)),
      },
    )

  return (
    <>
      <fieldset className="mt-[7px] max-md:mt-[10.5px]">
        <legend className="mb-[11px] text-md leading-4 font-bold max-md:mb-2">{t('detail.editionLegend')}</legend>
        <div className="flex flex-wrap gap-2.5 max-md:-ml-px md:-ml-px md:gap-1" role="radiogroup" aria-label={t('detail.edition')}>
          {nft.editions.map((item) => {
            const out = item.available === 0
            const selected = item.id === edition.id
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={out}
                disabled={out}
                onClick={() => onEditionChange(item.id)}
                className={cn('h-[30px] cursor-pointer rounded-full border-2 px-[5px] text-sm transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-50', selected ? 'border-primary font-medium text-highlight' : 'border-border text-text-secondary hover:border-primary')}
              >
                {item.label}
                {out && <span className="sr-only">{` ${t('detail.editionSoldOutSr')}`}</span>}
              </button>
            )
          })}
        </div>
        {soldOut && <p role="status" className="mt-2 text-xs text-destructive">{t('detail.editionSoldOut')}</p>}
      </fieldset>

      <div data-testid="purchase-row" className="mt-5 flex w-full flex-wrap items-center justify-between gap-x-6 gap-y-3 max-md:gap-y-5 max-md:sticky max-md:bottom-0 max-md:z-20 max-md:order-last max-md:-mx-6 max-md:mt-6 max-md:rounded-t-[2rem] max-md:bg-card max-md:px-6 max-md:pt-5 max-md:pb-[34px] max-md:shadow-[0_-12px_32px_rgba(0,0,0,0.45)] md:mt-3 md:grid md:min-h-[49.5px] md:grid-cols-[minmax(0,1fr)_268px] md:items-center md:gap-x-6">
        <div className="flex items-center gap-[9px] md:gap-3">
          <span aria-hidden="true" className="text-md font-medium text-text-secondary md:hidden">{t('detail.quantityShort')}</span>
          <QuantityStepper value={quantity} max={limit} onChange={setQuantity} size="adaptive" live testId="quantity" />
        </div>
        <p className="ml-auto text-xl font-bold text-highlight md:hidden" data-testid="mobile-price">{formatEth(edition.price)}</p>
        {!soldOut && quantity >= limit && <p className="basis-full text-xs text-muted-foreground md:col-span-2 md:order-last" role="status">{t('detail.limit', { count: limit })}</p>}
        <div className="flex w-full items-center gap-3 md:w-[268px] md:shrink-0 md:gap-2">
          <Button size="lg" className="h-[60px] flex-1 rounded-full bg-cta max-md:max-w-[196px] max-md:text-base md:h-10 md:w-auto md:min-w-0 md:flex-1 md:rounded-md md:bg-none md:bg-primary md:px-0 md:text-sm" disabled={soldOut || addToCart.isPending} onClick={() => submit(true)}>
            <span className="md:hidden">{t('detail.buyMobile')}</span>
            <span className="hidden md:inline">{t('detail.buy')}</span>
          </Button>
          <Button type="button" variant="ghost" size="icon-lg" aria-label={t('detail.addToCart')} disabled={soldOut || addToCart.isPending} onClick={() => submit(false)} className="size-[60px] rounded-full border border-border bg-elevated text-primary md:hidden">
            <CartIcon className="size-6" />
          </Button>
          <FavoriteLabel nft={nft} />
        </div>
      </div>
      <p className="sr-only" data-testid="selected-edition">{edition.label}</p>
    </>
  )
}

function FavoriteLabel({ nft }: { nft: NftDetail }) {
  return <FavoriteButton nft={nft} showLabel className="hidden size-auto h-10 min-w-0 flex-1 gap-2 rounded-md border border-primary bg-transparent text-sm font-medium text-highlight md:inline-flex" />
}

function Gallery({ nft }: { nft: NftDetail }) {
  const { t } = useTranslation()
  return (
    <div className="grid min-w-0 gap-6 xl:h-[448px] xl:w-[573px] xl:grid-cols-[100px_448px] xl:gap-x-[25px] xl:gap-y-0">
      <ul className="hidden gap-4 xl:grid xl:content-start" aria-label={t('detail.thumbnails')}>
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="rounded-md bg-card">
            <NftImage artwork={nft.artwork} alt={t('detail.thumbnail', { name: nft.name, index: i + 1 })} sizes="100px" size={160} className="rounded-lg" />
          </li>
        ))}
      </ul>
      <div className="relative bg-card max-md:-mr-[3px] max-md:bg-transparent md:flex md:aspect-square md:items-center md:justify-center md:rounded-md md:p-5 xl:mt-0 xl:h-[448px] xl:w-[448px] xl:p-0">
        <NftImage artwork={nft.artwork} alt={t('common.artOf', { name: nft.name })} sizes="(min-width: 1280px) 448px, (min-width: 768px) 42vw, 100vw" size={480} priority className="rounded-2xl max-md:aspect-[361/356] max-md:rounded-3xl max-md:object-[50%_20%] md:max-w-[404px] md:rounded-3xl xl:max-w-[448px]" />
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" aria-label={t('detail.zoom')} className="absolute top-[13px] right-3 flex size-[30px] cursor-pointer items-center justify-center rounded-full border border-border bg-elevated max-md:hidden">
              <SearchIcon className="size-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogTitle>{nft.name}</DialogTitle>
            <DialogDescription className="sr-only">{t('detail.zoomed')}</DialogDescription>
            <NftImage artwork={nft.artwork} alt={t('detail.zoomedAlt', { name: nft.name })} sizes="560px" size={480} className="rounded-xl" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export function DetailPage({ nftId }: { nftId: string }) {
  const { t } = useTranslation()
  const { data: nft, isPending, isError, error, refetch } = useNft(nftId)
  const reveal = useReveal(isPending)

  if (isPending) return <DetailSkeleton />
  if (isError) {
    if (isApiError(error) && error.code === 'NOT_FOUND') {
      return <NotFound title={t('detail.notFound.title')} message={t('detail.notFound.message')} />
    }
    return (
      <div role="alert" className="mx-auto flex max-w-page flex-col items-center gap-3 px-5 py-24 text-center">
        <p className="font-bold">{t('detail.loadError')}</p>
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button onClick={() => void refetch()}>{t('common.tryAgain')}</Button>
      </div>
    )
  }

  return (
    <div className={reveal}>
      <DetailContent key={nft.id} nft={nft} />
    </div>
  )
}

function DetailContent({ nft }: { nft: NftDetail }) {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const shareUrl = typeof window === 'undefined' ? pathname : `${window.location.origin}${pathname}`
  const [editionId, setEditionId] = useState(() => defaultEdition(nft.editions).id)
  const edition = nft.editions.find((candidate) => candidate.id === editionId) ?? defaultEdition(nft.editions)

  return (
    <>
      <span aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[506px] bg-tile md:hidden" />
      <MobileTopBar className="pt-[23px] pb-0" action={<FavoriteButton nft={nft} className="size-[35px] rounded-full border border-border bg-elevated" />} />
      <article className="mx-auto max-w-page px-7 pb-16 md:px-5 lg:pb-[43px]">
        <Breadcrumbs items={[{ label: t('common.home'), to: '/' }, { label: t('common.market') }]} />
        <div className="grid gap-6 pt-2 md:pt-3 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:gap-x-7 xl:grid-cols-[573px_minmax(0,1fr)]">
          <Gallery nft={nft} />
          <div className="relative rounded-t-3xl bg-card p-5 max-md:-mx-7 max-md:-mt-[54px] max-md:flex max-md:flex-col max-md:px-6 max-md:pt-[31px] max-md:pb-0 md:bg-transparent md:p-0 lg:pl-[5px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-xl font-bold md:text-title md:leading-[37px]">{nft.name}</h1>
              <p className="flex h-[27px] shrink-0 items-center gap-1 rounded-full border border-primary px-2 pt-1 text-sm leading-5 font-medium md:hidden">
                <StarIcon className="size-3.5 text-primary" /> {nft.rating.toFixed(1)}<span className="font-normal text-text-secondary">({nft.reviewCount})</span>
              </p>
            </div>
            <div className="mt-3 hidden flex-nowrap items-center justify-between gap-x-2 xl:gap-x-4 md:flex">
              <p className="text-[22px] leading-4 font-bold whitespace-nowrap text-highlight" data-testid="detail-price">{formatEth(edition.price)}</p>
              <p className="flex items-center gap-1 text-sm leading-5 whitespace-nowrap xl:text-md"><Stars rating={nft.rating} />{interpolate((slots) => t('detail.reviews', slots), { total: nft.reviewCount })}</p>
            </div>
            <div aria-hidden="true" className="mt-3 mr-[3.7%] hidden h-px bg-primary md:block" />
            <h2 className="mt-[13px] hidden text-md leading-4 font-bold md:block">{t('detail.about')}</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">{nft.description}</p>
            <Purchase nft={nft} edition={edition} onEditionChange={setEditionId} />
            <dl className="mt-[13px] space-y-3 text-md leading-5 text-muted-foreground max-md:mt-2.5">
              <div><dt className="inline">{`${t('common.tokenId')}: `}</dt><dd className="inline">#{nft.tokenId}</dd></div>
              <div><dt className="inline">{`${t('detail.collection')} `}</dt><dd className="inline">{nft.collectionName}</dd></div>
              <div><dt className="inline">{`${t('detail.attributes')} `}</dt><dd className="inline">{nft.attributes.join(', ')}</dd></div>
            </dl>
            <p className="mt-[9.5px] hidden items-center gap-2 text-md leading-4 font-bold md:flex">
              {t('detail.share.title')}
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label={t('detail.share.linkedin')} className="flex size-6 items-center justify-center hover:text-highlight"><LinkedinIcon className="size-[15px]" /></a>
              <a href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`} aria-label={t('detail.share.email')} className="flex size-6 items-center justify-center hover:text-highlight"><MessageIcon className="size-[18px]" /></a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`} target="_blank" rel="noopener noreferrer" aria-label={t('detail.share.x')} className="flex size-6 items-center justify-center hover:text-highlight"><XBrandIcon className="size-[14px]" /></a>
            </p>
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-[90px] hidden md:block">
          <TabsList className="h-7 w-full justify-start group-data-[orientation=horizontal]/tabs:h-7 gap-8 rounded-none border-b border-primary bg-transparent p-0">
            <TabsTrigger value="details" className="h-full flex-none items-start rounded-none border-0 border-b-[3px] border-transparent py-0 pr-2 pl-0 text-[17px] leading-4 font-normal text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-highlight">{t('detail.tabs.details')}</TabsTrigger>
            <TabsTrigger value="reviews" className="h-full flex-none items-start rounded-none border-0 border-b-[3px] border-transparent py-0 pr-2 pl-0 text-[17px] leading-4 font-normal text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-highlight">{interpolate((slots) => t('detail.tabs.reviews', slots), { total: nft.reviewCount })}</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-3 pt-3 text-sm leading-6 text-text-secondary">
            <div className="space-y-6">{nft.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <p><strong className="block text-foreground">{t('detail.network.title')}</strong>{t('detail.network.text')}</p>
            <p><strong className="block text-foreground">{t('detail.contract.title')}</strong>{interpolate((slots) => t('detail.contract.text', slots), { percent: nft.royaltiesPercent })}</p>
            <p><strong className="block text-foreground">{t('detail.royalties.title')}</strong>{interpolate((slots) => t('detail.royalties.text', slots), { address: nft.contractAddress })}</p>
          </TabsContent>
          <TabsContent value="reviews" className="pt-4 text-sm text-muted-foreground">{t('detail.reviewsUnavailable')}</TabsContent>
        </Tabs>

        <NftCarousel id="related" title={t('detail.related')} items={nft.related} />
        <p className="mt-8 text-center text-sm md:hidden"><Link to="/" className="text-highlight underline">{t('detail.seeMore')}</Link></p>
      </article>
    </>
  )
}

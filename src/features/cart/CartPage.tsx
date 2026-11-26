import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DeleteIcon } from '@/components/icons'
import { notify } from '@/lib/notify'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { NftImage } from '@/components/NftImage'
import { QuantityStepper } from '@/components/QuantityStepper'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartLine, QuoteIssue } from '@/contracts/cart'
import { NftCard } from '@/features/catalog/NftCard'
import { errorMessage } from '@/lib/api-error'
import { issueMessage } from '@/lib/quote-issues'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'
import { formatEth, mulEth } from '@/lib/eth'
import { useSession } from '@/lib/session-store'
import { announce } from '@/realtime/announcer'
import { useAcknowledgePrices, useCart, useQuote, useRemoveLine, useSetQuantity } from '@/queries/cart'
import { useCatalog } from '@/queries/catalog'
import { CouponForm, TotalsRows } from './Totals'

const TABLE_COLUMNS = 'md:grid-cols-[minmax(0,311fr)_minmax(0,139fr)_minmax(0,136fr)_minmax(0,148fr)_24px]'

function LineRow({ line, busy, onQuantity, onRemove }: { line: CartLine; busy: boolean; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  const { t } = useTranslation()
  const limit = Math.min(line.available, line.maxPerOrder)
  const priceChanged = line.unitPrice !== line.priceWhenAdded
  return (
    <li data-testid="cart-line" className={`grid grid-cols-[6.25rem_minmax(0,1fr)_auto] items-start max-md:grid-rows-[auto_1fr] max-[389px]:grid-rows-[auto_auto_auto]! max-[389px]:pb-3! gap-x-2.5 gap-y-0 rounded-[14px] bg-card p-0 pr-4 md:items-center md:h-[70px] md:gap-0 md:rounded-none md:pr-6 ${TABLE_COLUMNS}`}>
      <div className="flex items-center gap-4 max-md:contents">
        <Link to="/nft/$nftId" params={{ nftId: line.nftId }} aria-label={t('cart.view', { name: line.name })} className="w-25 shrink-0 max-md:row-span-2 max-md:row-start-1 max-[389px]:row-span-3! md:w-[70px]">
          <NftImage artwork={line.artwork} alt={t('common.artOf', { name: line.name })} sizes="(min-width: 768px) 70px, 100px" size={160} className="rounded-md max-md:rounded-[14px]" />
        </Link>
        <div className="min-w-0 max-md:col-span-2 max-md:col-start-2 max-md:row-start-1 max-md:pt-[13px] md:pr-3">
          <p className="truncate text-md leading-4 font-bold max-[389px]:whitespace-normal! md:text-base" title={line.name}>{line.name}</p>
          <p className="mt-[4.5px] text-sm text-text-secondary md:hidden">{t('cart.editionOf', { edition: line.editionLabel })}</p>
          <p className="mt-1.5 hidden truncate text-sm leading-4 text-muted-foreground md:block"><span className="xl:hidden">{t('common.tokenIdShort')}</span><span className="max-xl:hidden">{t('common.tokenId')}</span>: #{line.tokenId} · {line.editionLabel}</p>
        </div>
      </div>
      <p className="text-lg font-bold whitespace-nowrap text-highlight md:text-text-secondary max-md:col-start-2 max-md:row-start-2 max-md:mb-[9px] max-md:self-end max-[389px]:mt-1! max-[389px]:mb-0! max-[389px]:self-start! md:text-base md:leading-4" data-testid="line-unit">
        <span className="md:hidden">{formatEth(mulEth(line.unitPrice, line.quantity))}</span>
        <span className="max-md:hidden">{formatEth(line.unitPrice)}</span>
        {priceChanged && <span className="ml-2 text-xs font-normal text-muted-foreground line-through" data-testid="line-old-price">{formatEth(line.priceWhenAdded)}</span>}
      </p>
      <QuantityStepper value={line.quantity} max={limit} onChange={onQuantity} label={line.name} disabled={busy} testId="line-quantity" className="max-md:col-start-3 max-md:row-start-1 max-md:mt-[38px] max-md:gap-2 max-md:justify-self-end max-[389px]:col-start-2! max-[389px]:row-start-3! max-[389px]:mt-1! max-[389px]:justify-self-start!" buttonClassName="max-md:size-6 max-md:border max-md:border-border max-md:bg-elevated max-md:text-foreground max-md:before:hidden" outputClassName="max-md:relative max-md:top-1.5 max-md:w-[17px] max-md:text-base" />
      <p className="hidden text-base leading-4 font-bold whitespace-nowrap text-highlight md:block" data-testid="line-total">{formatEth(mulEth(line.unitPrice, line.quantity))}</p>
      <button type="button" aria-label={t('cart.removeLine', { name: line.name })} disabled={busy} onClick={onRemove} className="flex size-8 cursor-pointer items-center justify-center text-primary max-md:col-start-3 max-md:row-start-2 max-md:mb-1.5 max-md:self-end max-md:justify-self-end max-[389px]:row-start-3! max-[389px]:mb-0! max-[389px]:self-center! md:size-6">
        <DeleteIcon className="size-5" aria-hidden="true" />
      </button>
    </li>
  )
}

function Issues({ issues, onAcknowledge, pending }: { issues: QuoteIssue[]; onAcknowledge: () => void; pending: boolean }) {
  const { t } = useTranslation()
  if (!issues.length) return null
  const hasPriceChange = issues.some((issue) => issue.kind === 'price-changed')
  return (
    <div role="alert" data-testid="cart-issues" className="mb-4 space-y-2 rounded-sm border border-primary bg-card p-4 text-sm">
      <p className="font-bold">{t('cart.updated')}</p>
      <ul className="list-disc space-y-1 pl-5">
        {issues.map((issue) => <li key={`${issue.lineId}-${issue.kind}`}>{issueMessage(issue)}</li>)}
      </ul>
      {hasPriceChange && <Button size="sm" variant="outline" disabled={pending} onClick={onAcknowledge}>{t('cart.acknowledge')}</Button>}
    </div>
  )
}

export function CartPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useSession()
  const cart = useCart()
  const quote = useQuote('ethereum', cart.data)
  const setQuantity = useSetQuantity()
  const removeLine = useRemoveLine()
  const acknowledge = useAcknowledgePrices()
  const suggestions = useCatalog({})
  const busy = setQuantity.isPending || removeLine.isPending
  const reveal = useReveal(cart.isPending)

  const finalize = () => void navigate(session ? { to: '/checkout' } : { to: '/login', search: { redirect: '/checkout' } })
  const blocked = quote.data ? !quote.data.purchasable : true
  const blockingIssues = quote.data?.issues.filter((issue) => issue.kind !== 'price-changed') ?? []

  const content = (() => {
    if (cart.isPending) {
      return (
        <div role="status" aria-busy="true" aria-label={t('cart.loading')} data-testid="cart-skeleton" className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[4.5rem] w-full md:h-[4.5rem]" />)}
        </div>
      )
    }
    if (cart.isError) {
      return (
        <div role="alert" className="space-y-3 bg-card p-6 text-center">
          <p className="font-bold">{t('cart.loadError')}</p>
          <p className="text-sm text-muted-foreground">{errorMessage(cart.error)}</p>
          <Button onClick={() => void cart.refetch()}>{t('common.tryAgain')}</Button>
        </div>
      )
    }
    if (!cart.data.lines.length) {
      return (
        <div className="space-y-3 bg-card p-10 text-center" data-testid="cart-empty">
          <p className="font-bold">{t('cart.empty.title')}</p>
          <p className="text-sm text-muted-foreground">{t('cart.empty.text')}</p>
          <Link to="/" hash="catalogo" className={buttonVariants()}>{t('common.exploreNfts')}</Link>
        </div>
      )
    }
    return (
      <>
        <div className={`mb-3 hidden h-7 border-b border-primary pr-6 text-base leading-4 font-bold md:grid ${TABLE_COLUMNS}`} aria-hidden="true">
          <span>{t('common.nfts')}</span><span className="font-medium">{t('common.price')}</span><span>{t('common.editions')}</span><span className="font-medium">{t('common.total')}</span><span />
        </div>
        <ul className={cn(reveal, 'space-y-[20.67px] max-md:mt-px md:space-y-3')} aria-label={t('cart.lines')}>
          {cart.data.lines.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              busy={busy}
              onQuantity={(quantity) => setQuantity.mutate({ lineId: line.id, quantity }, { onSuccess: () => announce(t('realtime.quantityChanged', { name: line.name, quantity })), onError: (e) => notify.error(errorMessage(e)) })}
              onRemove={() => removeLine.mutate(line.id, { onSuccess: () => announce(t('realtime.lineRemoved', { name: line.name })), onError: (e) => notify.error(errorMessage(e)) })}
            />
          ))}
        </ul>
      </>
    )
  })()

  const hasLines = Boolean(cart.data?.lines.length)

  return (
    <>
      <MobileTopBar title={t('cart.title')} />
      <div className="mx-auto max-w-page px-7 pb-16 md:px-5 lg:pb-11">
        <Breadcrumbs items={[{ label: t('common.home'), to: '/' }, { label: t('common.market'), to: '/mercado' }, { label: t('cart.breadcrumb') }]} />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-1 pt-3 md:gap-8 xl:grid-cols-[minmax(0,1fr)_20.75rem] xl:gap-x-[min(86px,6vw)]">
          <section aria-label={t('cart.items')} className="min-w-0">
            {quote.data && <Issues issues={quote.data.issues} onAcknowledge={() => acknowledge.mutate(undefined, { onError: (e) => notify.error(errorMessage(e)) })} pending={acknowledge.isPending} />}
            {content}
          </section>
          <aside aria-labelledby="summary-title" className="min-w-0 max-md:-mx-7 max-md:rounded-t-3xl max-md:bg-card max-md:px-6 max-md:pt-6 max-md:pb-5">
            <h2 id="summary-title" className="hidden h-7 border-b border-primary text-lg leading-4 font-bold md:block">{t('cart.summary.title')}</h2>
            <div className="space-y-2.5 md:mt-[22px] md:space-y-0">
              {cart.data && hasLines && <CouponForm cart={cart.data} />}
              {cart.data && !hasLines ? <p className="text-sm text-muted-foreground">{t('cart.summary.empty')}</p> : <TotalsRows quote={quote.data} loading={quote.isPending} className="md:mt-[22px]" />}
              {blockingIssues.length > 0 && <p className="text-xs text-destructive" role="status">{t('cart.summary.blocked')}</p>}
              <Button size="lg" className="w-full mt-[18px] md:mt-5 max-md:h-[60px] max-md:rounded-full max-md:bg-cta max-md:text-base md:h-10 md:text-md" disabled={!hasLines || blocked || quote.isFetching} onClick={finalize}>
                {t('cart.summary.checkout')}
              </Button>
              <Link to="/" hash="catalogo" className="block text-center text-base text-highlight hover:underline md:mt-3 md:text-md md:leading-5">{t('cart.summary.continue')}</Link>
            </div>
          </aside>
        </div>

        <section aria-labelledby="also-title" className="mt-24 hidden md:block lg:mt-[96px]">
          <h2 id="also-title" className="h-7 border-b border-primary text-[17px] leading-4 font-bold text-highlight">{t('cart.alsoViewed')}</h2>
          <ul className="mt-8 grid grid-cols-3 gap-[26px] lg:grid-cols-5">
            {suggestions.data?.items.slice(0, 5).map((item) => <li key={item.id}><NftCard nft={item} sizes="220px" size="compact" /></li>) ?? [0, 1, 2, 3, 4].map((i) => <li key={i}><Skeleton className="aspect-square" /></li>)}
          </ul>
        </section>
      </div>
    </>
  )
}

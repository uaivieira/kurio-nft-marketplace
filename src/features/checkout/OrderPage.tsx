import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n'
import { CircleAlertGlyph, LoaderGlyph, XGlyph } from '@/components/icons/glyphs'
import { ThankYouIcon } from '@/components/icons'
import { NftImage } from '@/components/NftImage'
import { NotFound } from '@/components/layout/NotFound'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order, OrderFailure } from '@/contracts/order'
import { WALLET_PROVIDER_LABELS } from '@/contracts/common'
import { errorMessage, isApiError } from '@/lib/api-error'
import { decimalsFor, formatEth } from '@/lib/eth'
import { useOrder } from '@/queries/orders'
import { useRealtimeStatus } from '@/realtime/status'

const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`
const formatDate = (iso: string) => {
  const parts = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(new Date(iso))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  const month = part('month').replace('.', '')
  return `${part('day')} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${part('year')}`
}

function failureMessage(failure: OrderFailure) {
  if (!failure) return i18n.t('order.rejected.fallback')
  if (failure.code === 'OUT_OF_STOCK') return i18n.t('order.failure.OUT_OF_STOCK', { name: failure.name ?? '', edition: failure.edition ?? '' })
  return i18n.t('order.failure.PAYMENT_REJECTED')
}

function Lines({ order }: { order: Order }) {
  const { t } = useTranslation()
  const decimals = decimalsFor(order.subtotal, order.discount, order.networkFee, order.total)
  const row = 'flex items-baseline justify-between gap-3 md:min-h-6 md:items-center md:*:leading-[normal]'
  return (
    <section aria-labelledby="order-lines" className="px-6 pb-2 md:px-11">
      <h2 id="order-lines" className="pt-7 text-md leading-4 font-bold md:pt-5">{t('order.transactionDetails')}</h2>
      <div className="mt-3 grid h-7 grid-cols-[minmax(0,1fr)_auto] border-b border-border text-md leading-4 font-bold sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem] md:grid-cols-[minmax(0,1fr)_116px_77px] md:border-primary md:text-base" aria-hidden="true"><span>{t('common.nfts')}</span><span className="text-center max-sm:hidden md:text-left">{t('common.editions')}</span><span className="text-right md:text-left md:font-medium">{t('common.subtotal')}</span></div>
      <ul className="md:mt-3 md:space-y-3">
        {order.lines.map((line) => (
          <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pt-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem] md:-mr-[5px] md:h-[70px] md:grid-cols-[minmax(0,1fr)_116px_66px] md:gap-0 md:bg-card md:pt-0 md:pr-4" data-testid="receipt-line">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-[4.375rem] shrink-0"><NftImage artwork={line.artwork} alt={t('common.artOf', { name: line.name })} sizes="70px" size={160} className="rounded-md md:rounded-lg" /></div>
              <div className="min-w-0"><p className="truncate text-base leading-5 font-bold md:leading-4">{line.name}</p><p className="truncate text-sm text-muted-foreground md:mt-1.5 md:leading-4"><span className="sm:hidden">{t('common.tokenIdShort')}</span><span className="max-sm:hidden">{t('common.tokenId')}</span>: #{line.tokenId}</p></div>
            </div>
            <div className="flex flex-col items-end sm:contents">
              <p className="text-sm sm:text-center md:pl-[5px] md:text-left md:text-text-secondary">(x {line.quantity})</p>
              <p className="text-right text-lg font-bold whitespace-nowrap text-highlight md:justify-self-end">{formatEth(line.lineTotal)}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-b border-border pt-2 pb-3 text-md md:mt-0 md:ml-[169px] md:space-y-1.5 md:border-primary md:pt-2.5 md:pb-2">
        <div className={row}><dt>{t('common.subtotal')}</dt><dd>{formatEth(order.subtotal, decimals)}</dd></div>
        {order.couponCode && <div className={row}><dt>{t('order.discount', { code: order.couponCode })}</dt><dd>(-) {formatEth(order.discount, decimals)}</dd></div>}
        <div className={row}><dt>{t('common.networkFee')}</dt><dd className="md:text-lg">{formatEth(order.networkFee, decimals)}</dd></div>
        <div className={`${row} text-lg font-bold`}><dt className="md:text-base">{t('common.total')}</dt><dd className="text-highlight" data-testid="receipt-total">{formatEth(order.total, decimals)}</dd></div>
      </dl>
    </section>
  )
}

function Frame({ children, title }: { children: React.ReactNode; title: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-page px-5 py-10 md:pt-[97px] md:pb-24">
      <article aria-labelledby="order-title" className="relative mx-auto w-full max-w-[578px] border-b-[10px] border-primary bg-card">
        <button type="button" aria-label={t('order.close')} onClick={() => void navigate({ to: '/' })} className="absolute top-4 right-4 cursor-pointer text-primary"><XGlyph className="size-5" aria-hidden="true" /></button>
        <h1 id="order-title" className="sr-only">{title}</h1>
        {children}
      </article>
    </div>
  )
}

export function OrderPage({ orderId }: { orderId: string }) {
  const { t } = useTranslation()
  const { data: order, isPending, isError, error, refetch } = useOrder(orderId)
  const realtime = useRealtimeStatus()

  if (isPending) {
    return (
      <Frame title={t('order.loadingTitle')}>
        <div role="status" aria-busy="true" aria-label={t('order.loadingTitle')} className="space-y-4 p-8" data-testid="order-skeleton">
          <Skeleton className="mx-auto size-16" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-40 w-full" />
        </div>
      </Frame>
    )
  }
  if (isError) {
    if (isApiError(error) && (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')) {
      return <NotFound title={t('order.notFound.title')} message={t('order.notFound.message')} />
    }
    return (
      <Frame title={t('order.errorTitle')}>
        <div role="alert" className="space-y-3 p-8 text-center"><p className="font-bold">{t('order.loadError')}</p><p className="text-sm text-muted-foreground">{errorMessage(error)}</p><Button onClick={() => void refetch()}>{t('common.tryAgain')}</Button></div>
      </Frame>
    )
  }

  if (order.status === 'pending') {
    return (
      <Frame title={t('order.pending.title')}>
        <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-4 text-center" role="status" data-testid="order-pending">
          <LoaderGlyph className="size-12 animate-spin text-primary" aria-hidden="true" />
          <p className="text-lg font-bold">{t('order.pending.heading')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('order.pending.text')}</p>
          {realtime === 'offline' && <p className="text-xs text-highlight">{t('order.pending.offline')}</p>}
        </div>
        <Lines order={order} />
      </Frame>
    )
  }

  if (order.status === 'rejected') {
    return (
      <Frame title={t('order.rejected.title')}>
        <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-4 text-center" role="alert" data-testid="order-rejected">
          <CircleAlertGlyph className="size-12 text-destructive" aria-hidden="true" />
          <p className="text-lg font-bold">{t('order.rejected.title')}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{t('order.rejected.text', { reason: failureMessage(order.failure) })}</p>
          <Link to="/cart" className={buttonVariants()}>{t('order.rejected.backToCart')}</Link>
        </div>
        <Lines order={order} />
      </Frame>
    )
  }

  return (
    <Frame title={t('order.confirmed.title')}>
      <div className="flex flex-col items-center gap-3 border-b border-primary px-8 pt-10 pb-5 text-center md:pt-[22px] md:pb-[18px]">
        <ThankYouIcon className="size-20 text-primary" />
        <p className="text-base font-bold text-text-secondary" data-testid="order-confirmed">{t('order.confirmed.heading')}</p>
      </div>
      <dl className="grid grid-cols-2 gap-y-3 border-b border-primary px-6 py-3 text-sm leading-5 md:grid-cols-[180.67px_144.33px_126.33px_minmax(0,1fr)] md:px-0 md:pt-[13px] md:pb-[16.5px] md:text-text-secondary [&>div]:px-3 md:[&>div]:relative md:[&>div]:pl-[17.67px] md:[&>div:first-child]:pl-9 md:[&_dd]:text-md md:[&_dd]:leading-4 md:[&_dt]:text-text-secondary">
        <div><dt className="font-bold text-muted-foreground">{t('order.confirmed.transactionId')}</dt><dd data-testid="receipt-hash" title={order.transactionHash ?? undefined}>{order.transactionHash ? shortHash(order.transactionHash) : '—'}</dd></div>
        <div><span aria-hidden="true" className="absolute top-1 left-0 hidden h-[31px] w-px bg-primary md:block" /><dt className="text-muted-foreground">{t('order.confirmed.date')}</dt><dd>{formatDate(order.updatedAt)}</dd></div>
        <div><span aria-hidden="true" className="absolute top-1 left-0 hidden h-[31px] w-px bg-primary md:block" /><dt className="text-muted-foreground">{t('common.total')}</dt><dd>{formatEth(order.total)}</dd></div>
        <div><span aria-hidden="true" className="absolute top-1 left-0 hidden h-[31px] w-px bg-primary md:block" /><dt className="font-bold text-muted-foreground">{t('order.confirmed.wallet')}</dt><dd>{WALLET_PROVIDER_LABELS[order.wallet.provider]}</dd></div>
      </dl>
      <Lines order={order} />
      <p className="px-11 py-4 text-center text-sm leading-[22px] text-text-secondary">{t('order.confirmed.text')}</p>
      <div className="flex justify-center pb-8">
        <Dialog>
          <DialogTrigger asChild><Button className="md:h-12 md:w-[186px] md:rounded-[5px] md:text-base">{t('order.confirmed.explorer')}</Button></DialogTrigger>
          <DialogContent>
            <DialogTitle>{t('order.confirmed.explorerTitle')}</DialogTitle>
            <DialogDescription>{t('order.confirmed.explorerDescription')}</DialogDescription>
            <p className="font-mono text-xs break-all" data-testid="explorer-hash">{order.transactionHash}</p>
          </DialogContent>
        </Dialog>
      </div>
    </Frame>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { notify } from '@/lib/notify'
import { applyCouponInput } from '@/contracts/cart'
import type { Cart, Quote } from '@/contracts/cart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '@/lib/api-error'
import { decimalsFor, formatEth } from '@/lib/eth'
import { translateMessage } from '@/i18n'
import { cn } from '@/lib/utils'
import { announce } from '@/realtime/announcer'
import { useApplyCoupon, useRemoveCoupon } from '@/queries/cart'

export function CouponForm({ cart }: { cart: Cart }) {
  const { t } = useTranslation()
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm({ resolver: zodResolver(applyCouponInput), defaultValues: { code: '' } })
  const error = form.formState.errors.code?.message ?? serverError ?? undefined

  if (cart.couponCode) {
    return (
      <div className="flex items-center justify-between rounded-sm border border-primary px-3 py-2 text-sm" data-testid="coupon-applied">
        <span><Trans i18nKey="cart.coupon.applied" values={{ code: cart.couponCode }} components={{ strong: <strong /> }} /></span>
        <Button
          variant="link"
          size="xs"
          disabled={remove.isPending}
          onClick={() => remove.mutate(undefined, { onSuccess: () => announce(t('realtime.couponRemoved')), onError: (e) => notify.error(errorMessage(e)) })}
        >
          {t('common.remove')}
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(({ code }) => {
        setServerError(null)
        apply.mutate(code, {
          onSuccess: () => { form.reset(); announce(t('realtime.couponApplied')) },
          onError: (e) => setServerError(errorMessage(e)),
        })
      })}
    >
      <label htmlFor="coupon-code" className="mb-1.5 block text-sm font-bold max-md:sr-only">{t('cart.coupon.label')}</label>
      <div className="flex h-[50px] rounded-full border border-border bg-card has-aria-invalid:border-destructive md:h-10 md:rounded-sm md:border-primary md:bg-transparent">
        <input
          id="coupon-code"
          {...form.register('code', { onChange: () => setServerError(null) })}
          autoComplete="off"
          placeholder={t('cart.coupon.placeholder')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : undefined}
          className="w-0 min-w-0 flex-1 rounded-l-full bg-transparent pt-0.5 pr-2 pl-[15px] text-[13px] md:pt-0 placeholder:text-muted-foreground text-ellipsis md:rounded-l-sm md:pl-[7px] md:text-xs"
        />
        <button type="submit" disabled={apply.isPending} className="-my-px -mr-px h-[50px] w-[97px] shrink-0 cursor-pointer rounded-full bg-apply text-md font-bold text-foreground hover:bg-highlight disabled:opacity-60 md:h-10 md:w-[102px] md:rounded-none md:rounded-r-sm md:bg-primary md:bg-none md:text-primary-foreground">
          {t('common.apply')}
        </button>
      </div>
      {error && <p id="coupon-error" role="alert" className="mt-1.5 text-xs text-destructive">{translateMessage(error)}</p>}
    </form>
  )
}

export function CollapsibleCoupon({ cart }: { cart: Cart }) {
  const [open, setOpen] = useState(Boolean(cart.couponCode))
  if (open) return <CouponForm cart={cart} />
  return (
    <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className="w-full cursor-pointer text-center text-md hover:text-highlight md:text-sm">
      <Trans i18nKey="cart.coupon.reveal" components={{ emphasis: <span className="underline-offset-4 hover:underline" /> }} />
    </button>
  )
}

export function TotalsRows({ quote, loading, className, variant = 'cart' }: { quote: Quote | undefined; loading: boolean; className?: string; variant?: 'cart' | 'checkout' }) {
  const { t } = useTranslation()
  if (!quote) {
    return (
      <div role="status" aria-busy={loading} aria-label={t('cart.totals.loading')} className={cn('space-y-3', className)} data-testid="totals-skeleton">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
        <Skeleton className="mt-4 h-7 w-full" />
      </div>
    )
  }
  const decimals = decimalsFor(quote.subtotal, quote.discount, quote.networkFee, quote.total)
  const row = 'flex min-h-6 items-center justify-between gap-3 *:leading-[normal]'
  return (
    <dl className={cn('space-y-2 text-base max-md:text-md md:text-md', className)} data-testid="totals">
      <div className={row}><dt>{t('common.subtotal')}</dt><dd data-testid="subtotal" className="whitespace-nowrap max-md:text-base md:text-lg">{formatEth(quote.subtotal, decimals)}</dd></div>
      <div className={row}><dt>{t('cart.totals.discount')}</dt><dd data-testid="discount" className="whitespace-nowrap">(-) {formatEth(quote.discount, decimals)}</dd></div>
      <div>
        <div className={row}><dt>{t('common.networkFee')}</dt><dd data-testid="fee" className="whitespace-nowrap max-md:text-base md:text-lg">{formatEth(quote.networkFee, decimals)}</dd></div>
        <p className={cn('mt-2.5 text-xs text-highlight max-md:-mt-0.5', variant === 'checkout' ? 'text-center' : 'text-right')}>{t('cart.totals.estimatedFee')}</p>
      </div>
      <div className={cn(row, 'pt-3 text-lg font-bold max-md:pt-0', variant === 'checkout' && 'md:mt-3 md:border-t md:border-primary md:px-[42px] md:pt-[7px]')}><dt className="text-base">{t('common.total')}</dt><dd className="whitespace-nowrap text-highlight" data-testid="total">{formatEth(quote.total, decimals)}</dd></div>
    </dl>
  )
}

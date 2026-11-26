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
      <div className="flex">
        <input
          id="coupon-code"
          {...form.register('code', { onChange: () => setServerError(null) })}
          autoComplete="off"
          placeholder={t('cart.coupon.placeholder')}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : undefined}
          className="h-10 w-0 min-w-0 flex-1 rounded-l-sm border border-input bg-background px-3 text-xs placeholder:text-muted-foreground aria-invalid:border-destructive text-ellipsis max-[413px]:text-xs max-md:h-[50px] max-md:rounded-l-full max-md:border-r-0 max-md:px-4 max-md:text-sm"
        />
        <button type="submit" disabled={apply.isPending} className="h-10 cursor-pointer rounded-r-sm bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-highlight disabled:opacity-60 max-md:h-[50px] max-md:w-[97px] max-md:rounded-full max-md:-ml-6 max-md:bg-cta max-md:px-0 max-md:text-base">
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
    <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className="w-full cursor-pointer text-center text-md hover:text-highlight">
      <Trans i18nKey="cart.coupon.reveal" components={{ emphasis: <span className="underline-offset-4 hover:underline" /> }} />
    </button>
  )
}

export function TotalsRows({ quote, loading }: { quote: Quote | undefined; loading: boolean }) {
  const { t } = useTranslation()
  if (!quote) {
    return (
      <div role="status" aria-busy={loading} aria-label={t('cart.totals.loading')} className="space-y-3" data-testid="totals-skeleton">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
        <Skeleton className="mt-4 h-7 w-full" />
      </div>
    )
  }
  const decimals = decimalsFor(quote.subtotal, quote.discount, quote.networkFee, quote.total)
  const row = 'flex items-baseline justify-between gap-3 *:leading-5'
  return (
    <dl className="space-y-3 text-base max-md:text-md max-md:leading-5 md:text-md" data-testid="totals">
      <div className={row}><dt>{t('common.subtotal')}</dt><dd data-testid="subtotal" className="whitespace-nowrap max-md:text-base md:text-lg">{formatEth(quote.subtotal, decimals)}</dd></div>
      <div className={row}><dt>{t('cart.totals.discount')}</dt><dd data-testid="discount" className="whitespace-nowrap">(-) {formatEth(quote.discount, decimals)}</dd></div>
      <div>
        <div className={row}><dt>{t('common.networkFee')}</dt><dd data-testid="fee" className="whitespace-nowrap max-md:text-base md:text-lg">{formatEth(quote.networkFee, decimals)}</dd></div>
        <p className="mt-3 text-right text-xs text-highlight max-md:mt-0">{t('cart.totals.estimatedFee')}</p>
      </div>
      <div className={cn(row, 'pt-2 text-lg font-bold max-md:-mt-1 max-md:pt-0')}><dt className="text-base">{t('common.total')}</dt><dd className="whitespace-nowrap text-highlight" data-testid="total">{formatEth(quote.total, decimals)}</dd></div>
    </dl>
  )
}

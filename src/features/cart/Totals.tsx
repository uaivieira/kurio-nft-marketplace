import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { notify } from '@/lib/notify'
import { applyCouponInput } from '@/contracts/cart'
import type { Cart, Quote } from '@/contracts/cart'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage, isApiError } from '@/lib/api-error'
import { formatEth, isZeroEth } from '@/lib/eth'
import { announce } from '@/realtime/announcer'
import { useApplyCoupon, useRemoveCoupon } from '@/queries/cart'

export function CouponForm({ cart }: { cart: Cart }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm({ resolver: zodResolver(applyCouponInput), defaultValues: { code: '' } })
  const error = form.formState.errors.code?.message ?? serverError ?? undefined

  if (cart.couponCode) {
    return (
      <div className="flex items-center justify-between rounded-sm border border-primary px-3 py-2 text-sm" data-testid="coupon-applied">
        <span>Cupom <strong>{cart.couponCode}</strong> aplicado</span>
        <Button
          variant="link"
          size="xs"
          disabled={remove.isPending}
          onClick={() => remove.mutate(undefined, { onSuccess: () => announce('Cupom removido.'), onError: (e) => notify.error(errorMessage(e)) })}
        >
          Remover
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
          onSuccess: () => { form.reset(); announce('Cupom aplicado.') },
          onError: (e) => setServerError(isApiError(e) && (e.code === 'COUPON_INVALID' || e.code === 'COUPON_EXPIRED') ? e.message : errorMessage(e)),
        })
      })}
    >
      <label htmlFor="coupon-code" className="mb-2 block text-sm font-bold tracking-wide max-md:sr-only">Código promocional</label>
      <div className="flex">
        <input
          id="coupon-code"
          {...form.register('code', { onChange: () => setServerError(null) })}
          autoComplete="off"
          placeholder="Digite o código promocional..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : undefined}
          className="h-10 min-w-0 flex-1 rounded-l-sm border border-input bg-background px-3 text-xs placeholder:text-muted-foreground aria-invalid:border-destructive max-md:h-[50px] max-md:rounded-l-full max-md:border-r-0 max-md:px-4 max-md:text-sm"
        />
        <button type="submit" disabled={apply.isPending} className="h-10 cursor-pointer rounded-r-sm bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-highlight disabled:opacity-60 max-md:h-[50px] max-md:rounded-full max-md:-ml-6 max-md:bg-cta max-md:px-6 max-md:text-base">
          Aplicar
        </button>
      </div>
      {error && <p id="coupon-error" role="alert" className="mt-1.5 text-xs text-destructive">{error}</p>}
    </form>
  )
}

/** Checkout variant from the Figma: a text link that reveals the coupon form. */
export function CollapsibleCoupon({ cart }: { cart: Cart }) {
  const [open, setOpen] = useState(Boolean(cart.couponCode))
  if (open) return <CouponForm cart={cart} />
  return (
    <button type="button" onClick={() => setOpen(true)} aria-expanded={false} className="w-full cursor-pointer text-center text-md hover:text-highlight">
      Tem um código promocional? <span className="underline-offset-4 hover:underline">Aplique aqui</span>
    </button>
  )
}

export function TotalsRows({ quote, loading }: { quote: Quote | undefined; loading: boolean }) {
  if (!quote) {
    return (
      <div role="status" aria-busy={loading} aria-label="Calculando valores" className="space-y-3" data-testid="totals-skeleton">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
        <Skeleton className="mt-4 h-7 w-full" />
      </div>
    )
  }
  return (
    <dl className="space-y-3 text-base md:text-md" data-testid="totals">
      <div className="flex justify-between"><dt>Subtotal</dt><dd data-testid="subtotal" className="md:text-lg">{formatEth(quote.subtotal)}</dd></div>
      <div className="flex justify-between gap-3"><dt>Desconto do lançamento</dt><dd data-testid="discount" className="whitespace-nowrap">(-) {isZeroEth(quote.discount) ? '00.00' : formatEth(quote.discount)}</dd></div>
      <div>
        <div className="flex justify-between"><dt>Taxa de rede</dt><dd data-testid="fee" className="md:text-lg">{formatEth(quote.networkFee)}</dd></div>
        <p className="mt-0.5 text-right text-xs text-highlight">Taxa estimada</p>
      </div>
      <div className="flex justify-between border-t border-border pt-4 text-lg font-bold"><dt>Total</dt><dd className="text-highlight" data-testid="total">{formatEth(quote.total)}</dd></div>
    </dl>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { notify } from '@/lib/notify'
import { connectWallet, createOrder, disconnectWallet } from '@/api/orders'
import { Field } from '@/components/form/Field'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { NftImage } from '@/components/NftImage'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import type { Quote } from '@/contracts/cart'
import { NETWORK_LABELS, NETWORKS, WALLET_PROVIDER_LABELS, WALLET_PROVIDERS, type Network, type WalletProvider } from '@/contracts/common'
import { ENS_SUFFIXES } from '@/contracts/profile'
import type { Wallet, WalletConnection } from '@/contracts/wallet'
import { CollapsibleCoupon, TotalsRows } from '@/features/cart/Totals'
import { ApiError, errorMessage, isApiError } from '@/lib/api-error'
import { issueMessage } from '@/lib/quote-issues'
import { loadCheckoutDraft, saveCheckoutDraft } from '@/lib/checkout-draft'
import { formatEth } from '@/lib/eth'
import { forgetIdempotencyKey, idempotencyKeyFor } from '@/lib/idempotency'
import { getSession } from '@/lib/session-store'
import { cn } from '@/lib/utils'
import { announce } from '@/realtime/announcer'
import { useCart, useQuote } from '@/queries/cart'
import { keys } from '@/queries/keys'
import { useProfile, useWallets } from '@/queries/account'
import { usePendingOrders } from '@/queries/orders'
import { checkoutSchema, type CheckoutValues } from './schema'
import { ReviewDialog } from './ReviewDialog'

type Connection = { state: 'idle' } | { state: 'connecting' } | { state: 'connected'; connection: WalletConnection } | { state: 'refused'; message: string }

export function CheckoutPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = getSession()!
  const userId = session.user.id
  const profile = useProfile()
  const wallets = useWallets()
  const cart = useCart()
  const pending = usePendingOrders()

  const registered = useMemo(() => [wallets.data?.primary, wallets.data?.secondary].filter((wallet): wallet is Wallet => Boolean(wallet)), [wallets.data])
  const draft = useMemo(() => loadCheckoutDraft(userId), [userId])
  const [walletId, setWalletId] = useState<string | null>((draft?.values.walletId as string | undefined) ?? null)
  const selectedWallet = registered.find((wallet) => wallet.id === walletId) ?? registered[0]
  const [connection, setConnection] = useState<Connection>({ state: 'idle' })
  const [provider, setProvider] = useState<WalletProvider | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const activeProvider = provider ?? selectedWallet?.provider

  const form = useForm<CheckoutValues>({ resolver: zodResolver(checkoutSchema), mode: 'onBlur', defaultValues: { ensSuffix: '.eth', network: 'ethereum', note: '' } })
  const network = useWatch({ control: form.control, name: 'network' }) as Network
  const quote = useQuote(network, cart.data)

  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !profile.data || !selectedWallet) return
    prefilled.current = true
    form.reset({
      displayName: profile.data.displayName,
      username: profile.data.username,
      profileName: selectedWallet.profileName,
      email: profile.data.email,
      referralCode: selectedWallet.referralCode,
      ensLabel: profile.data.ensLabel,
      ensSuffix: profile.data.ensSuffix,
      note: '',
      network: selectedWallet.network,
      ...(draft?.values.form as Partial<CheckoutValues> | undefined),
    })
  }, [profile.data, selectedWallet, draft, form])

  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => saveCheckoutDraft({ userId, values: { form: values, walletId: selectedWallet?.id } }),
    })
  }, [form, userId, selectedWallet?.id])

  const connect = useMutation({
    mutationFn: connectWallet,
    onMutate: () => setConnection({ state: 'connecting' }),
    onSuccess: (result) => { setConnection({ state: 'connected', connection: result }); announce(t('realtime.walletConnected')) },
    onError: (error) => { setConnection({ state: 'refused', message: errorMessage(error) }); announce(t('realtime.walletRefused')) },
  })
  const disconnect = useMutation({
    mutationFn: disconnectWallet,
    onSuccess: () => { setConnection({ state: 'idle' }); announce(t('realtime.walletDisconnected')) },
    onError: (error) => notify.error(errorMessage(error)),
  })

  const chooseWallet = (id: string) => {
    if (id === selectedWallet?.id) return
    if (connection.state === 'connected') disconnect.mutate(connection.connection.id)
    setConnection({ state: 'idle' })
    setProvider(null)
    setWalletId(id)
    const wallet = registered.find((candidate) => candidate.id === id)
    if (wallet) {
      form.setValue('network', wallet.network)
      form.setValue('profileName', wallet.profileName)
      form.setValue('referralCode', wallet.referralCode)
    }
  }

  const chooseProvider = (value: WalletProvider) => {
    if (value === activeProvider) return
    if (connection.state === 'connected') disconnect.mutate(connection.connection.id)
    setConnection({ state: 'idle' })
    setProvider(value)
  }

  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewed, setReviewed] = useState<Quote | null>(null)
  const [previousTotal, setPreviousTotal] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const locked = useRef(false)

  const payloadFor = (values: ReturnType<typeof checkoutSchema.parse>, snapshot: Quote) => ({
    quoteId: snapshot.id,
    quoteVersion: snapshot.version,
    walletId: selectedWallet!.id,
    connectionId: connection.state === 'connected' ? connection.connection.id : '',
    network: values.network,
    buyer: {
      displayName: values.displayName,
      username: values.username,
      profileName: values.profileName,
      email: values.email,
      referralCode: values.referralCode,
      ensName: `${values.ensLabel}${values.ensSuffix}`,
      note: values.note || undefined,
    },
  })

  const submit = useMutation({
    mutationFn: async () => {
      const values = checkoutSchema.parse(form.getValues())
      const payload = payloadFor(values, reviewed!)
      const key = idempotencyKeyFor(payload)
      try {
        return { order: await createOrder(payload, key), payload }
      } catch (error) {
        if (!(error instanceof ApiError) || (error.code !== 'TIMEOUT' && error.code !== 'NETWORK')) throw error
        announce(t('realtime.orderRetrying'))
        return { order: await createOrder(payload, key), payload }
      }
    },
    onSuccess: ({ order, payload }) => {
      forgetIdempotencyKey(payload)
      void queryClient.invalidateQueries({ queryKey: keys.pendingOrders(userId) })
      queryClient.setQueryData(keys.order(userId, order.id), order)
      setReviewOpen(false)
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: async (error) => {
      if (isApiError(error) && error.code === 'QUOTE_STALE') {
        const fresh = (error.details as { quote?: Quote } | undefined)?.quote
        if (fresh) {
          setPreviousTotal(reviewed?.total ?? null)
          setReviewed(fresh)
          setSubmitError(null)
          announce(t('realtime.quoteChanged'))
          void queryClient.invalidateQueries({ queryKey: keys.cart(userId) })
          await queryClient.invalidateQueries({ queryKey: ['private', userId, 'quote'] })
          return
        }
      }
      if (isApiError(error) && error.code === 'AVAILABILITY_CONFLICT') {
        setReviewOpen(false)
        void queryClient.invalidateQueries({ queryKey: keys.cart(userId) })
        await queryClient.invalidateQueries({ queryKey: ['private', userId, 'quote'] })
        const message = errorMessage(error)
        notify.error(message)
        announce(message)
        return
      }
      if (error instanceof ApiError && (error.code === 'TIMEOUT' || error.code === 'NETWORK')) {
        setSubmitError(t('checkout.noResponse'))
        return
      }
      setSubmitError(errorMessage(error))
    },
    onSettled: (_data, error) => {
      if (error) locked.current = false
    },
  })

  const hasPendingOrder = (pending.data?.length ?? 0) > 0
  const connected = connection.state === 'connected'

  const openReview = form.handleSubmit(
    () => {
    if (!selectedWallet) return
    if (!connected) {
      setConnection({ state: 'refused', message: t('checkout.connectFirst') })
      document.getElementById('wallet-connect')?.focus()
      return
    }
    if (!quote.data?.purchasable) return
    setReviewed(quote.data)
    setPreviousTotal(null)
    setSubmitError(null)
    setReviewOpen(true)
    },
    () => setFormOpen(true),
  )

  const confirm = () => {
    if (locked.current || submit.isPending) return
    locked.current = true
    setSubmitError(null)
    submit.mutate()
  }

  const { errors } = form.formState
  const loading = profile.isPending || wallets.isPending || cart.isPending
  const confirmDisabled = loading || !selectedWallet || !quote.data?.purchasable || hasPendingOrder || quote.isFetching
  const lines = cart.data?.lines ?? []

  if (!loading && cart.data && !lines.length && !hasPendingOrder && !submit.isPending) {
    return (
      <div className="mx-auto max-w-page space-y-3 px-5 py-20 text-center" data-testid="checkout-empty">
        <p className="font-bold">{t('cart.empty.title')}</p>
        <Link to="/" hash="catalogo" className={buttonVariants()}>{t('common.exploreNfts')}</Link>
      </div>
    )
  }

  return (
    <>
      <MobileTopBar title={t('checkout.title')} />
      <div className="mx-auto max-w-page px-7 pb-20 md:px-5">
        <Breadcrumbs items={[{ label: t('common.home'), to: '/' }, { label: t('common.market'), to: '/mercado' }, { label: t('checkout.breadcrumb') }]} />

        {hasPendingOrder && (
          <p role="status" data-testid="pending-order-banner" className="mt-4 rounded-sm border border-primary bg-card p-3 text-sm">
            <Trans i18nKey="checkout.pendingOrder" components={{ anchor: <Link to="/orders/$orderId" params={{ orderId: pending.data![0]!.id }} className="font-bold text-highlight underline" /> }} />
          </p>
        )}

        <form noValidate onSubmit={(event) => { event.preventDefault(); void openReview() }} className="grid gap-8 pt-4 max-md:pt-0 lg:grid-cols-[minmax(0,767fr)_minmax(400px,405fr)] lg:gap-x-7 lg:pt-[27px]">
          <section aria-labelledby="buyer-title" className="max-md:order-2">
            <h2 id="buyer-title" className="mb-4 text-lg font-bold max-md:hidden lg:mb-[11px] lg:text-[17px]">{t('checkout.buyerTitle')}</h2>
            <button type="button" aria-expanded={formOpen} aria-controls="buyer-fields" onClick={() => setFormOpen((open) => !open)} className="mb-4 flex w-full cursor-pointer items-center justify-between rounded-xl bg-card px-4 py-3 text-base font-bold md:hidden">
              {t('checkout.buyerToggle')}
              <span aria-hidden="true" className="text-highlight">{formOpen ? '−' : '+'}</span>
            </button>
            {loading ? (
              <div role="status" aria-busy="true" aria-label={t('checkout.loading')} className="grid gap-4 sm:grid-cols-2" data-testid="checkout-skeleton">
                {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div id="buyer-fields" className={cn('grid gap-x-[23px] gap-y-4 sm:grid-cols-2 lg:gap-y-5', !formOpen && 'max-md:hidden')}>
                <Field label={t('common.fields.displayName')} required error={errors.displayName?.message}>{(p) => <Input {...p} autoComplete="name" {...form.register('displayName')} />}</Field>
                <Field label={t('common.fields.username')} required error={errors.username?.message}>{(p) => <Input {...p} autoComplete="username" {...form.register('username')} />}</Field>
                <Field label={t('common.fields.network')} required error={errors.network?.message}>
                  {(p) => (
                    <Controller control={form.control} name="network" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger {...p}><SelectValue placeholder={t('common.fields.selectNetwork')} /></SelectTrigger>
                        <SelectContent>{NETWORKS.map((value) => <SelectItem key={value} value={value}>{NETWORK_LABELS[value]}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  )}
                </Field>
                <Field label={t('common.fields.profileName')} required error={errors.profileName?.message}>{(p) => <Input {...p} {...form.register('profileName')} />}</Field>
                <Field label={t('common.fields.walletAddress')} required hint={t('checkout.addressHint')}>{(p) => <Input {...p} readOnly value={selectedWallet?.address ?? ''} placeholder={t('common.fields.walletAddressPlaceholder')} />}</Field>
                <Field label={t('common.fields.walletType')} required>{(p) => <Input {...p} readOnly value={selectedWallet ? WALLET_PROVIDER_LABELS[selectedWallet.provider] : ''} placeholder={t('common.fields.selectWallet')} />}</Field>
                <Field label={t('common.fields.email')} required error={errors.email?.message}>{(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}</Field>
                <Field label={t('common.fields.referralCode')} required error={errors.referralCode?.message}>{(p) => <Input {...p} {...form.register('referralCode')} />}</Field>
                <Field label={t('common.fields.ensName')} required error={errors.ensLabel?.message ?? errors.ensSuffix?.message}>
                  {(p) => (
                    <div className="flex gap-2">
                      <Controller control={form.control} name="ensSuffix" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger aria-label={t('common.fields.ensSuffix')} className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>{ENS_SUFFIXES.map((suffix) => <SelectItem key={suffix} value={suffix}>{suffix}</SelectItem>)}</SelectContent>
                        </Select>
                      )} />
                      <Input {...p} {...form.register('ensLabel')} />
                    </div>
                  )}
                </Field>
                {registered.length > 1 && (
                  <label className="flex cursor-pointer items-center gap-2 text-base max-md:hidden sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={selectedWallet?.slot === 'secondary'}
                      onChange={(event) => chooseWallet(registered.find((wallet) => wallet.slot === (event.target.checked ? 'secondary' : 'primary'))!.id)}
                      className="size-4 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-primary checked:bg-primary checked:shadow-[inset_0_0_0_2px_var(--background)]"
                    />
                    {t('checkout.useOtherWallet')}
                  </label>
                )}
                <Field label={t('checkout.note')} error={errors.note?.message} className="sm:col-span-2">{(p) => <Textarea {...p} rows={4} {...form.register('note')} />}</Field>
              </div>
            )}
          </section>

          <aside className="max-md:order-1" aria-label={t('checkout.summary')}>
            <div className="max-md:hidden">
            <h2 className="text-lg leading-4 font-bold lg:mt-[5px] lg:text-[17px]">{t('checkout.yourNfts')}</h2>
            <p aria-hidden="true" className="mt-3 flex h-7 justify-between border-b border-border text-base leading-4 font-bold max-md:hidden"><span>{t('common.nfts')}</span><span>{t('common.subtotal')}</span></p>
            <ul className="mt-3 space-y-3" aria-label={t('checkout.lines')} data-testid="checkout-lines">
              {cart.isPending && [0, 1].map((i) => <Skeleton key={i} className="h-[4.5rem]" />)}
              {lines.map((line) => (
                <li key={line.id} className="flex h-[70px] items-center gap-3 bg-card pr-4">
                  <div className="w-[4.375rem] shrink-0"><NftImage artwork={line.artwork} alt={t('common.artOf', { name: line.name })} sizes="70px" size={160} className="rounded-sm" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm leading-tight font-bold" title={line.name}>{line.name}</p>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">{t('common.tokenIdShort')}: #{line.tokenId}</p>
                  </div>
                  <p className="shrink-0 text-xs whitespace-nowrap">(x {line.quantity})</p>
                  <p className="shrink-0 text-lg font-bold whitespace-nowrap text-highlight">{formatEth(quote.data?.lines.find((item) => item.id === line.id)?.lineTotal ?? line.unitPrice)}</p>
                </li>
              ))}
            </ul>
            </div>
            <div className="mt-4 space-y-4 max-md:mt-0">
              <div className="space-y-4 max-md:hidden">
                {cart.data && lines.length > 0 && <CollapsibleCoupon cart={cart.data} />}
                <TotalsRows quote={quote.data} loading={quote.isPending} />
              </div>
              {quote.data && quote.data.issues.filter((issue) => issue.kind !== 'price-changed').map((issue) => <p key={issue.lineId} role="alert" className="text-xs text-destructive">{issueMessage(issue)}</p>)}
            </div>

            {registered.length === 0 && !loading && (
              <p className="mt-6 rounded-sm border border-border p-3 text-sm" data-testid="no-wallets">
                <Trans i18nKey="checkout.noWallets" components={{ anchor: <Link to="/profile/wallets" className="font-bold text-highlight underline" /> }} />
              </p>
            )}

            {registered.length > 0 && (
              <section aria-labelledby="connected-title" className="mt-3 md:hidden">
                <div className="flex items-center justify-between">
                  <h2 id="connected-title" className="text-base font-bold">{t('checkout.connectedWallet')}</h2>
                  <Link to="/profile/wallets" className="text-sm font-bold text-highlight">{t('checkout.changeWallet')}</Link>
                </div>
                <div role="radiogroup" aria-labelledby="connected-title" className="mt-3 space-y-5">
                  {registered.map((wallet) => (
                    <label key={wallet.id} className="flex cursor-pointer items-center gap-[18px] rounded-xl bg-card px-5 py-3">
                      <input type="radio" name="wallet-mobile" value={wallet.id} checked={wallet.id === selectedWallet?.id} onChange={() => chooseWallet(wallet.id)} className="size-4 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-input checked:border-primary checked:bg-primary checked:shadow-[inset_0_0_0_2px_var(--card)]" />
                      <span className="flex-1 leading-6">
                        <span className="block text-base font-bold">{wallet.slot === 'primary' ? t('checkout.primary') : t('checkout.backup')}</span>
                        <span className="block text-sm leading-[22px] text-text-secondary">{wallet.ensLabel ? `${wallet.ensLabel}${wallet.ensSuffix}` : `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}</span>
                        <span className="block text-sm leading-[22px] text-text-secondary">{t('checkout.networkOf', { network: NETWORK_LABELS[wallet.network] })}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {selectedWallet && (
              <fieldset className="mt-[15px] md:mt-6">
                <legend className="mb-3 text-base font-bold md:w-full md:text-center">{t('checkout.walletAndNetwork')}</legend>
                <div className="space-y-4 md:space-y-3">
                  {WALLET_PROVIDERS.map((value) => {
                    const compatible = value === 'walletconnect' || value === selectedWallet.provider
                    const checked = value === activeProvider
                    return (
                      <label
                        key={value}
                        className={cn(
                          'flex h-16 items-center gap-3 rounded-xl bg-card px-4 text-md md:h-11 md:rounded-none md:border md:bg-transparent',
                          checked ? 'md:border-foreground' : 'md:border-border',
                          compatible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <input
                          type="radio"
                          name="provider"
                          value={value}
                          checked={checked}
                          disabled={!compatible}
                          onChange={() => chooseProvider(value)}
                          className="order-last size-4 accent-[var(--primary)] max-md:shrink-0 max-md:cursor-pointer max-md:appearance-none max-md:rounded-full max-md:border-2 max-md:border-input max-md:checked:border-primary max-md:checked:bg-primary max-md:checked:shadow-[inset_0_0_0_2px_var(--card)] max-md:disabled:cursor-not-allowed md:order-first"
                        />
                        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full border border-border text-sm font-bold text-primary md:hidden">
                          {WALLET_PROVIDER_LABELS[value][0]}
                        </span>
                        <span className="flex-1">
                          {WALLET_PROVIDER_LABELS[value]}
                          {!compatible && <span className="sr-only">{` ${t('checkout.providerUnavailable')}`}</span>}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm" data-testid="wallet-connection">
                  {connected ? (
                    <>
                      <p role="status" className="flex-1 text-success">{t('checkout.connectedTo', { address: `${selectedWallet.address.slice(0, 6)}…${selectedWallet.address.slice(-4)}` })}</p>
                      <Button type="button" size="sm" variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate(connection.connection.id)}>{t('checkout.disconnect')}</Button>
                    </>
                  ) : (
                    <Button id="wallet-connect" type="button" size="sm" variant="outline" disabled={connection.state === 'connecting'} onClick={() => connect.mutate({ walletId: selectedWallet.id, provider: activeProvider!, network })}>
                      {connection.state === 'connecting' ? t('checkout.connecting') : t('checkout.connect')}
                    </Button>
                  )}
                  {connection.state === 'refused' && <p role="alert" className="basis-full text-xs text-destructive">{connection.message}</p>}
                </div>
              </fieldset>
            )}

            <Button type="submit" size="lg" className="mt-6 w-full max-md:hidden" disabled={confirmDisabled}>
              {t('checkout.confirm')}
            </Button>
          </aside>
          <p className="order-3 flex items-baseline justify-end gap-6 text-lg font-bold md:hidden" data-testid="mobile-total">
            {t('checkout.mobileTotal')}
            <span className="text-xl text-highlight">{quote.data ? formatEth(quote.data.total) : '—'}</span>
          </p>
          <Button type="submit" size="lg" className="order-3 h-[60px] w-full rounded-full bg-cta text-base md:hidden" disabled={confirmDisabled}>
            {t('checkout.confirm')}
          </Button>
        </form>
      </div>

      {reviewed && selectedWallet && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          quote={reviewed}
          previousTotal={previousTotal}
          liveVersion={quote.data?.version}
          onRefresh={() => { if (quote.data) setReviewed(quote.data) }}
          wallet={selectedWallet}
          pending={submit.isPending}
          error={submitError}
          onConfirm={confirm}
        />
      )}
    </>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
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
  /** Mobile shows only the wallet step (as in the frame); buyer data is prefilled and collapsible. */
  const [formOpen, setFormOpen] = useState(false)
  const activeProvider = provider ?? selectedWallet?.provider

  const form = useForm<CheckoutValues>({ resolver: zodResolver(checkoutSchema), mode: 'onBlur', defaultValues: { ensSuffix: '.eth', network: 'ethereum', note: '' } })
  const network = useWatch({ control: form.control, name: 'network' }) as Network
  const quote = useQuote(network, cart.data)

  // Prefill once the profile and wallet are known, unless a saved draft already supplied the values.
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

  // Persist the form so a session expiry mid-checkout can be resumed after login.
  useEffect(() => {
    return form.subscribe({
      formState: { values: true },
      callback: ({ values }) => saveCheckoutDraft({ userId, values: { form: values, walletId: selectedWallet?.id } }),
    })
  }, [form, userId, selectedWallet?.id])

  const connect = useMutation({
    mutationFn: connectWallet,
    onMutate: () => setConnection({ state: 'connecting' }),
    onSuccess: (result) => { setConnection({ state: 'connected', connection: result }); announce('Carteira conectada.') },
    onError: (error) => { setConnection({ state: 'refused', message: errorMessage(error) }); announce('A carteira recusou a conexão.') },
  })
  const disconnect = useMutation({
    mutationFn: disconnectWallet,
    onSuccess: () => { setConnection({ state: 'idle' }); announce('Carteira desconectada.') },
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

  /* ----------------------------------------------------------------- review & submit */
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
      // The key is derived from the payload, so resending the same request reuses it and the
      // server answers with the order it already created instead of creating a second one.
      const key = idempotencyKeyFor(payload)
      try {
        return { order: await createOrder(payload, key), payload }
      } catch (error) {
        if (!(error instanceof ApiError) || (error.code !== 'TIMEOUT' && error.code !== 'NETWORK')) throw error
        announce('A resposta demorou. Verificando o pedido sem criar outra compra…')
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
          announce('Os valores do pedido mudaram. Revise e confirme novamente.')
          void queryClient.invalidateQueries({ queryKey: keys.cart(userId) })
          await queryClient.invalidateQueries({ queryKey: ['private', userId, 'quote'] })
          return
        }
      }
      if (isApiError(error) && error.code === 'AVAILABILITY_CONFLICT') {
        setReviewOpen(false)
        void queryClient.invalidateQueries({ queryKey: keys.cart(userId) })
        await queryClient.invalidateQueries({ queryKey: ['private', userId, 'quote'] })
        notify.error(error.message)
        announce(error.message)
        return
      }
      if (error instanceof ApiError && (error.code === 'TIMEOUT' || error.code === 'NETWORK')) {
        setSubmitError('Não recebemos resposta do servidor. Enviar novamente reutiliza a mesma tentativa, sem duplicar a compra.')
        return
      }
      setSubmitError(errorMessage(error))
    },
    onSettled: () => { locked.current = false },
  })

  const hasPendingOrder = (pending.data?.length ?? 0) > 0
  const connected = connection.state === 'connected'

  const openReview = form.handleSubmit(
    () => {
    if (!selectedWallet) return
    if (!connected) {
      setConnection({ state: 'refused', message: 'Conecte a carteira selecionada para continuar.' })
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

  /* ------------------------------------------------------------------------- render */
  const { errors } = form.formState
  const loading = profile.isPending || wallets.isPending || cart.isPending
  const confirmDisabled = loading || !selectedWallet || !quote.data?.purchasable || hasPendingOrder || quote.isFetching
  const lines = cart.data?.lines ?? []

  if (!loading && cart.data && !lines.length && !hasPendingOrder && !submit.isPending) {
    return (
      <div className="mx-auto max-w-page space-y-3 px-5 py-20 text-center" data-testid="checkout-empty">
        <p className="font-bold">Seu carrinho está vazio</p>
        <Link to="/" hash="catalogo" className={buttonVariants()}>Explorar NFTs</Link>
      </div>
    )
  }

  return (
    <>
      <MobileTopBar title="Pagamento com carteira" />
      <div className="mx-auto max-w-page px-5 pb-20">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/mercado' }, { label: 'Pagamento' }]} />

        {hasPendingOrder && (
          <p role="status" data-testid="pending-order-banner" className="mt-4 rounded-sm border border-primary bg-card p-3 text-sm">
            Você tem um pedido em andamento.{' '}
            <Link to="/orders/$orderId" params={{ orderId: pending.data![0]!.id }} className="font-bold text-highlight underline">Acompanhar pedido</Link>
          </p>
        )}

        <form noValidate onSubmit={(event) => { event.preventDefault(); void openReview() }} className="grid gap-8 pt-4 lg:grid-cols-[minmax(0,763px)_1fr] lg:gap-8">
          <section aria-labelledby="buyer-title" className="max-md:order-2">
            <h2 id="buyer-title" className="mb-4 text-lg font-bold max-md:hidden">Perfil do colecionador</h2>
            <button type="button" aria-expanded={formOpen} aria-controls="buyer-fields" onClick={() => setFormOpen((open) => !open)} className="mb-4 flex w-full cursor-pointer items-center justify-between rounded-xl bg-card px-4 py-3 text-base font-bold md:hidden">
              Dados do colecionador
              <span aria-hidden="true" className="text-highlight">{formOpen ? '−' : '+'}</span>
            </button>
            {loading ? (
              <div role="status" aria-busy="true" aria-label="Carregando dados" className="grid gap-4 sm:grid-cols-2" data-testid="checkout-skeleton">
                {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : (
              <div id="buyer-fields" className={cn('grid gap-x-[23px] gap-y-4 sm:grid-cols-2', !formOpen && 'max-md:hidden')}>
                <Field label="Nome de exibição" required error={errors.displayName?.message}>{(p) => <Input {...p} autoComplete="name" {...form.register('displayName')} />}</Field>
                <Field label="Nome de usuário" required error={errors.username?.message}>{(p) => <Input {...p} autoComplete="username" {...form.register('username')} />}</Field>
                <Field label="Rede" required error={errors.network?.message}>
                  {(p) => (
                    <Controller control={form.control} name="network" render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger {...p}><SelectValue placeholder="Selecione uma rede" /></SelectTrigger>
                        <SelectContent>{NETWORKS.map((value) => <SelectItem key={value} value={value}>{NETWORK_LABELS[value]}</SelectItem>)}</SelectContent>
                      </Select>
                    )} />
                  )}
                </Field>
                <Field label="Nome do perfil" required error={errors.profileName?.message}>{(p) => <Input {...p} {...form.register('profileName')} />}</Field>
                <Field label="Endereço da carteira" required hint="Preenchido pela carteira selecionada.">{(p) => <Input {...p} readOnly value={selectedWallet?.address ?? ''} placeholder="Endereço 0x da carteira" />}</Field>
                <Field label="Tipo de carteira" required>{(p) => <Input {...p} readOnly value={selectedWallet ? WALLET_PROVIDER_LABELS[selectedWallet.provider] : ''} placeholder="Selecione uma carteira" />}</Field>
                <Field label="E-mail" required error={errors.email?.message}>{(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}</Field>
                <Field label="Código de indicação" required error={errors.referralCode?.message}>{(p) => <Input {...p} {...form.register('referralCode')} />}</Field>
                <Field label="Nome ENS" required error={errors.ensLabel?.message ?? errors.ensSuffix?.message}>
                  {(p) => (
                    <div className="flex gap-2">
                      <Controller control={form.control} name="ensSuffix" render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger aria-label="Sufixo ENS" className="w-24"><SelectValue /></SelectTrigger>
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
                      className="size-4 rounded-full accent-[var(--primary)]"
                    />
                    Usar outra carteira?
                  </label>
                )}
                <Field label="Observação do colecionador (opcional)" error={errors.note?.message} className="sm:col-span-2">{(p) => <Textarea {...p} rows={4} {...form.register('note')} />}</Field>
              </div>
            )}
          </section>

          <aside className="max-md:order-1" aria-label="Resumo do pedido">
            {/* The mobile frame shows only the wallet step and the total; items and breakdown stay desktop-only. */}
            <div className="max-md:hidden">
            <h2 className="text-lg leading-4 font-bold">Seus NFTs</h2>
            <p aria-hidden="true" className="mt-3 flex h-7 justify-between border-b border-border text-base leading-4 font-bold max-md:hidden"><span>NFTs</span><span>Subtotal</span></p>
            <ul className="mt-3 space-y-3" aria-label="Itens do pedido" data-testid="checkout-lines">
              {cart.isPending && [0, 1].map((i) => <Skeleton key={i} className="h-[4.5rem]" />)}
              {lines.map((line) => (
                <li key={line.id} className="flex h-[70px] items-center gap-3 bg-card pr-4">
                  <div className="w-[4.375rem] shrink-0"><NftImage artwork={line.artwork} alt={`Arte de ${line.name}`} sizes="70px" size={160} className="rounded-sm" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-tight font-bold">{line.name}</p>
                    <p className="text-xs whitespace-nowrap text-muted-foreground">ID: #{line.tokenId}</p>
                  </div>
                  <p className="text-xs">(x {line.quantity})</p>
                  <p className="text-lg font-bold text-highlight">{formatEth(quote.data?.lines.find((item) => item.id === line.id)?.lineTotal ?? line.unitPrice)}</p>
                </li>
              ))}
            </ul>
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-4 max-md:hidden">
                {cart.data && lines.length > 0 && <CollapsibleCoupon cart={cart.data} />}
                <TotalsRows quote={quote.data} loading={quote.isPending} />
              </div>
              {quote.data && quote.data.issues.filter((issue) => issue.kind !== 'price-changed').map((issue) => <p key={issue.lineId} role="alert" className="text-xs text-destructive">{issue.message}</p>)}
            </div>

            {registered.length === 0 && !loading && (
              <p className="mt-6 rounded-sm border border-border p-3 text-sm" data-testid="no-wallets">
                Você ainda não cadastrou uma carteira. <Link to="/profile/wallets" className="font-bold text-highlight underline">Cadastrar carteira</Link>
              </p>
            )}

            {registered.length > 0 && (
              <section aria-labelledby="connected-title" className="mt-6 md:hidden">
                <div className="flex items-center justify-between">
                  <h2 id="connected-title" className="text-base font-bold">Carteira conectada</h2>
                  <Link to="/profile/wallets" className="text-sm font-bold text-highlight">Trocar carteira</Link>
                </div>
                <div role="radiogroup" aria-labelledby="connected-title" className="mt-3 space-y-3">
                  {registered.map((wallet) => (
                    <label key={wallet.id} className="flex cursor-pointer items-center gap-4 rounded-xl bg-card px-4 py-4">
                      <input type="radio" name="wallet-mobile" value={wallet.id} checked={wallet.id === selectedWallet?.id} onChange={() => chooseWallet(wallet.id)} className="size-4 accent-[var(--primary)]" />
                      <span className="flex-1 leading-6">
                        <span className="block text-base font-bold">{wallet.slot === 'primary' ? 'Principal' : 'Reserva'}</span>
                        <span className="block text-sm text-text-secondary">{wallet.ensLabel ? `${wallet.ensLabel}${wallet.ensSuffix}` : `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}</span>
                        <span className="block text-sm text-text-secondary">Rede {NETWORK_LABELS[wallet.network]}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            )}

            {selectedWallet && (
              <fieldset className="mt-6">
                <legend className="mb-3 text-base font-bold md:w-full md:text-center">Carteira e rede</legend>
                <div className="space-y-3">
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
                          className="order-last size-4 accent-[var(--primary)] md:order-first"
                        />
                        <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full border border-border text-sm font-bold text-primary md:hidden">
                          {WALLET_PROVIDER_LABELS[value][0]}
                        </span>
                        <span className="flex-1">
                          {WALLET_PROVIDER_LABELS[value]}
                          {!compatible && <span className="sr-only"> (indisponível para esta carteira)</span>}
                        </span>
                      </label>
                    )
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm" data-testid="wallet-connection">
                  {connected ? (
                    <>
                      <p role="status" className="flex-1 text-success">Conectada: {selectedWallet.address.slice(0, 6)}…{selectedWallet.address.slice(-4)}</p>
                      <Button type="button" size="sm" variant="outline" disabled={disconnect.isPending} onClick={() => disconnect.mutate(connection.connection.id)}>Desconectar</Button>
                    </>
                  ) : (
                    <Button id="wallet-connect" type="button" size="sm" variant="outline" disabled={connection.state === 'connecting'} onClick={() => connect.mutate({ walletId: selectedWallet.id, provider: activeProvider!, network })}>
                      {connection.state === 'connecting' ? 'Conectando…' : 'Conectar carteira'}
                    </Button>
                  )}
                  {connection.state === 'refused' && <p role="alert" className="basis-full text-xs text-destructive">{connection.message}</p>}
                </div>
              </fieldset>
            )}

            <Button type="submit" size="lg" className="mt-6 w-full max-md:hidden" disabled={confirmDisabled}>
              Confirmar compra
            </Button>
          </aside>
          {/* On mobile the form comes after the summary, so the action closes the page. */}
          <p className="order-3 flex items-baseline justify-end gap-6 text-lg font-bold md:hidden" data-testid="mobile-total">
            Total:
            <span className="text-xl text-highlight">{quote.data ? formatEth(quote.data.total) : '—'}</span>
          </p>
          <Button type="submit" size="lg" className="order-3 h-[60px] w-full rounded-full bg-cta text-base md:hidden" disabled={confirmDisabled}>
            Confirmar compra
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

import { Link, useNavigate } from '@tanstack/react-router'
import { MinusGlyph, PlusGlyph } from '@/components/icons/glyphs'
import { DeleteIcon } from '@/components/icons'
import { notify } from '@/lib/notify'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { NftImage } from '@/components/NftImage'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { CartLine, QuoteIssue } from '@/contracts/cart'
import { NftCard } from '@/features/catalog/NftCard'
import { errorMessage } from '@/lib/api-error'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'
import { formatEth, mulEth } from '@/lib/eth'
import { useSession } from '@/lib/session-store'
import { announce } from '@/realtime/announcer'
import { useAcknowledgePrices, useCart, useQuote, useRemoveLine, useSetQuantity } from '@/queries/cart'
import { useCatalog } from '@/queries/catalog'
import { CouponForm, TotalsRows } from './Totals'

function LineRow({ line, busy, onQuantity, onRemove }: { line: CartLine; busy: boolean; onQuantity: (quantity: number) => void; onRemove: () => void }) {
  const limit = Math.min(line.available, line.maxPerOrder)
  const priceChanged = line.unitPrice !== line.priceWhenAdded
  return (
    <li data-testid="cart-line" className="grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-0 rounded-2xl bg-card p-0 pr-3 md:h-[70px] md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_24px] lg:grid-cols-[311px_139px_136px_148px_24px] md:gap-0 md:rounded-none md:pr-6">
      <div className="flex items-center gap-4 max-md:contents">
        <Link to="/nft/$nftId" params={{ nftId: line.nftId }} aria-label={`Ver ${line.name}`} className="w-25 shrink-0 max-md:row-span-3 max-md:row-start-1 md:w-[70px]">
          <NftImage artwork={line.artwork} alt={`Arte de ${line.name}`} sizes="(min-width: 768px) 70px, 100px" size={160} className="rounded-sm max-md:rounded-2xl" />
        </Link>
        <div className="min-w-0 max-md:col-start-2 max-md:row-start-1">
          <p className="truncate text-md font-bold md:text-base md:leading-4">{line.name}</p>
          <p className="text-sm text-muted-foreground md:hidden">Edição: {line.editionLabel}</p>
          <p className="mt-1.5 hidden truncate text-sm leading-4 text-muted-foreground md:block">ID do token: #{line.tokenId} · {line.editionLabel}</p>
        </div>
      </div>
      <p className="text-lg font-bold text-highlight max-md:col-start-2 max-md:row-start-3 md:text-base md:leading-4" data-testid="line-unit">
        {formatEth(line.unitPrice)}
        {priceChanged && <span className="ml-2 text-xs font-normal text-muted-foreground line-through" data-testid="line-old-price">{formatEth(line.priceWhenAdded)}</span>}
      </p>
      <div role="group" aria-label={`Quantidade de ${line.name}`} className="flex items-center gap-3 max-md:col-start-2 max-md:row-start-2 max-md:justify-self-end">
        <button type="button" aria-label={`Diminuir quantidade de ${line.name}`} disabled={busy || line.quantity <= 1} onClick={() => onQuantity(line.quantity - 1)} className="flex size-5 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 max-md:size-6 max-md:bg-background max-md:text-foreground">
          <MinusGlyph className="size-3.5" aria-hidden="true" />
        </button>
        <output className="w-4 text-center text-sm md:text-base" data-testid="line-quantity">{line.quantity}</output>
        <button type="button" aria-label={`Aumentar quantidade de ${line.name}`} disabled={busy || line.quantity >= limit} onClick={() => onQuantity(line.quantity + 1)} className="flex size-5 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 max-md:size-6 max-md:bg-background max-md:text-foreground">
          <PlusGlyph className="size-3.5" aria-hidden="true" />
        </button>
      </div>
      <p className="hidden text-base leading-4 font-bold text-highlight md:block" data-testid="line-total">{formatEth(mulEth(line.unitPrice, line.quantity))}</p>
      <button type="button" aria-label={`Remover ${line.name} do carrinho`} disabled={busy} onClick={onRemove} className="flex size-8 cursor-pointer items-center justify-center text-primary max-md:col-start-2 max-md:row-start-3 max-md:justify-self-end md:size-6">
        <DeleteIcon className="size-5" aria-hidden="true" />
      </button>
    </li>
  )
}

function Issues({ issues, onAcknowledge, pending }: { issues: QuoteIssue[]; onAcknowledge: () => void; pending: boolean }) {
  if (!issues.length) return null
  const hasPriceChange = issues.some((issue) => issue.kind === 'price-changed')
  return (
    <div role="alert" data-testid="cart-issues" className="mb-4 space-y-2 rounded-sm border border-primary bg-card p-4 text-sm">
      <p className="font-bold">Seu carrinho foi atualizado</p>
      <ul className="list-disc space-y-1 pl-5">
        {issues.map((issue) => <li key={`${issue.lineId}-${issue.kind}`}>{issue.message}</li>)}
      </ul>
      {hasPriceChange && <Button size="sm" variant="outline" disabled={pending} onClick={onAcknowledge}>Entendi, manter no carrinho</Button>}
    </div>
  )
}

export function CartPage() {
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
        <div role="status" aria-busy="true" aria-label="Carregando carrinho" data-testid="cart-skeleton" className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[4.5rem] w-full md:h-[4.5rem]" />)}
        </div>
      )
    }
    if (cart.isError) {
      return (
        <div role="alert" className="space-y-3 bg-card p-6 text-center">
          <p className="font-bold">Não foi possível carregar o carrinho.</p>
          <p className="text-sm text-muted-foreground">{errorMessage(cart.error)}</p>
          <Button onClick={() => void cart.refetch()}>Tentar novamente</Button>
        </div>
      )
    }
    if (!cart.data.lines.length) {
      return (
        <div className="space-y-3 bg-card p-10 text-center" data-testid="cart-empty">
          <p className="font-bold">Seu carrinho está vazio</p>
          <p className="text-sm text-muted-foreground">Explore o catálogo e adicione NFTs para comprar.</p>
          <Link to="/" hash="catalogo" className={buttonVariants()}>Explorar NFTs</Link>
        </div>
      )
    }
    return (
      <>
        <div className="mb-3 hidden h-7 md:grid-cols-[minmax(0,2.2fr)_1fr_1fr_1fr_24px] lg:grid-cols-[311px_139px_136px_148px_24px] border-b border-border text-base leading-4 font-bold md:grid" aria-hidden="true">
          <span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span />
        </div>
        <ul className={cn(reveal, 'space-y-5 md:space-y-3')} aria-label="Itens do carrinho">
          {cart.data.lines.map((line) => (
            <LineRow
              key={line.id}
              line={line}
              busy={busy}
              onQuantity={(quantity) => setQuantity.mutate({ lineId: line.id, quantity }, { onSuccess: () => announce(`Quantidade de ${line.name}: ${quantity}.`), onError: (e) => notify.error(errorMessage(e)) })}
              onRemove={() => removeLine.mutate(line.id, { onSuccess: () => announce(`${line.name} removido do carrinho.`), onError: (e) => notify.error(errorMessage(e)) })}
            />
          ))}
        </ul>
      </>
    )
  })()

  const hasLines = Boolean(cart.data?.lines.length)

  return (
    <>
      <MobileTopBar title="Carrinho de NFTs" />
      <div className="mx-auto max-w-page px-5 pb-16">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado', to: '/' }, { label: 'Carrinho' }]} />
        <div className="grid gap-8 pt-3 lg:grid-cols-[1fr_20.75rem] lg:gap-[86px]">
          <section aria-label="Itens" className="min-w-0">
            {quote.data && <Issues issues={quote.data.issues} onAcknowledge={() => acknowledge.mutate(undefined, { onError: (e) => notify.error(errorMessage(e)) })} pending={acknowledge.isPending} />}
            {content}
          </section>
          <aside aria-labelledby="summary-title" className="max-md:-mx-5 max-md:rounded-t-3xl max-md:bg-card max-md:p-5">
            <h2 id="summary-title" className="hidden h-7 border-b border-border text-lg leading-4 font-bold md:block">Resumo da carteira</h2>
            <div className="space-y-5 md:mt-6">
              {cart.data && hasLines && <CouponForm cart={cart.data} />}
              {cart.data && !hasLines ? <p className="text-sm text-muted-foreground">Adicione itens para ver o resumo.</p> : <TotalsRows quote={quote.data} loading={quote.isPending} />}
              {blockingIssues.length > 0 && <p className="text-xs text-destructive" role="status">Resolva os itens indisponíveis para finalizar.</p>}
              <Button size="lg" className="w-full max-md:h-[60px] max-md:rounded-full max-md:bg-cta max-md:text-base md:h-10 md:text-md" disabled={!hasLines || blocked || quote.isFetching} onClick={finalize}>
                Conectar e finalizar
              </Button>
              <Link to="/" hash="catalogo" className="block text-center text-base text-highlight hover:underline">Continuar explorando</Link>
            </div>
          </aside>
        </div>

        <section aria-labelledby="also-title" className="mt-24 hidden md:block">
          <h2 id="also-title" className="h-7 border-b border-border text-base leading-4 font-bold text-highlight">Colecionadores também viram</h2>
          <ul className="mt-8 grid grid-cols-3 gap-[26px] lg:grid-cols-5">
            {suggestions.data?.items.slice(0, 5).map((item) => <li key={item.id}><NftCard nft={item} sizes="220px" /></li>) ?? [0, 1, 2, 3, 4].map((i) => <li key={i}><Skeleton className="aspect-square" /></li>)}
          </ul>
        </section>
      </div>
    </>
  )
}

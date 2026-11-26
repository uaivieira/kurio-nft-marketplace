import { Link, useNavigate } from '@tanstack/react-router'
import { CircleAlertGlyph, LoaderGlyph, XGlyph } from '@/components/icons/glyphs'
import { ThankYouIcon } from '@/components/icons'
import { NftImage } from '@/components/NftImage'
import { NotFound } from '@/components/layout/NotFound'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { Order } from '@/contracts/order'
import { WALLET_PROVIDER_LABELS } from '@/contracts/common'
import { errorMessage, isApiError } from '@/lib/api-error'
import { decimalsFor, formatEth } from '@/lib/eth'
import { useOrder } from '@/queries/orders'
import { useRealtimeStatus } from '@/realtime/status'

const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`
/** "29 Jul, 2026" as in the confirmation frame, with the Portuguese month abbreviation. */
const formatDate = (iso: string) => {
  const parts = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).formatToParts(new Date(iso))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  const month = part('month').replace('.', '')
  return `${part('day')} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${part('year')}`
}

function Lines({ order }: { order: Order }) {
  const decimals = decimalsFor(order.subtotal, order.discount, order.networkFee, order.total)
  const row = 'flex items-baseline justify-between gap-3'
  return (
    <section aria-labelledby="order-lines" className="px-6 pb-2 md:px-11">
      <h2 id="order-lines" className="pt-7 text-md leading-4 font-bold">Detalhes da transação</h2>
      {/* Below 640px the quantity moves above the subtotal so the name keeps its width. */}
      <div className="mt-3 grid h-7 grid-cols-[minmax(0,1fr)_auto] border-b border-border text-md leading-4 font-bold sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem]" aria-hidden="true"><span>NFTs</span><span className="text-center max-sm:hidden">Edições</span><span className="text-right">Subtotal</span></div>
      <ul>
        {order.lines.map((line) => (
          <li key={line.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 pt-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_6.5rem]" data-testid="receipt-line">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-[4.375rem] shrink-0"><NftImage artwork={line.artwork} alt={`Arte de ${line.name}`} sizes="70px" size={160} className="rounded-md" /></div>
              <div className="min-w-0"><p className="truncate text-base leading-5 font-bold">{line.name}</p><p className="truncate text-sm text-muted-foreground"><span className="sm:hidden">ID</span><span className="max-sm:hidden">ID do token</span>: #{line.tokenId}</p></div>
            </div>
            <div className="flex flex-col items-end sm:contents">
              <p className="text-sm sm:text-center">(x {line.quantity})</p>
              <p className="text-right text-lg font-bold whitespace-nowrap text-highlight">{formatEth(line.lineTotal)}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-b border-border pt-2 pb-3 text-md">
        <div className={row}><dt>Subtotal</dt><dd>{formatEth(order.subtotal, decimals)}</dd></div>
        {order.couponCode && <div className={row}><dt>Desconto ({order.couponCode})</dt><dd>(-) {formatEth(order.discount, decimals)}</dd></div>}
        <div className={row}><dt>Taxa de rede</dt><dd>{formatEth(order.networkFee, decimals)}</dd></div>
        <div className={`${row} text-lg font-bold`}><dt>Total</dt><dd className="text-highlight" data-testid="receipt-total">{formatEth(order.total, decimals)}</dd></div>
      </dl>
    </section>
  )
}

function Frame({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate()
  return (
    <div className="mx-auto max-w-page px-5 py-10 md:pt-[72px] md:pb-24">
      <article aria-labelledby="order-title" className="relative mx-auto w-full max-w-[578px] border-b-[10px] border-primary bg-card">
        <button type="button" aria-label="Fechar" onClick={() => void navigate({ to: '/' })} className="absolute top-4 right-4 cursor-pointer text-primary"><XGlyph className="size-5" aria-hidden="true" /></button>
        <h1 id="order-title" className="sr-only">{title}</h1>
        {children}
      </article>
    </div>
  )
}

export function OrderPage({ orderId }: { orderId: string }) {
  const { data: order, isPending, isError, error, refetch } = useOrder(orderId)
  const realtime = useRealtimeStatus()

  if (isPending) {
    return (
      <Frame title="Carregando pedido">
        <div role="status" aria-busy="true" aria-label="Carregando pedido" className="space-y-4 p-8" data-testid="order-skeleton">
          <Skeleton className="mx-auto size-16" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-40 w-full" />
        </div>
      </Frame>
    )
  }
  if (isError) {
    if (isApiError(error) && (error.code === 'NOT_FOUND' || error.code === 'FORBIDDEN')) {
      return <NotFound title="Pedido não encontrado" message="Este pedido não existe ou não pertence à sua conta." />
    }
    return (
      <Frame title="Erro ao carregar pedido">
        <div role="alert" className="space-y-3 p-8 text-center"><p className="font-bold">Não foi possível carregar o pedido.</p><p className="text-sm text-muted-foreground">{errorMessage(error)}</p><Button onClick={() => void refetch()}>Tentar novamente</Button></div>
      </Frame>
    )
  }

  if (order.status === 'pending') {
    return (
      <Frame title="Pedido em processamento">
        <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-4 text-center" role="status" data-testid="order-pending">
          <LoaderGlyph className="size-12 animate-spin text-primary" aria-hidden="true" />
          <p className="text-lg font-bold">Aguardando confirmação</p>
          <p className="max-w-sm text-sm text-muted-foreground">Estamos confirmando seu pagamento na rede. Você pode recarregar a página: seu pedido não será duplicado.</p>
          {realtime === 'offline' && <p className="text-xs text-highlight">Sem conexão em tempo real. Continuamos verificando o status.</p>}
        </div>
        <Lines order={order} />
      </Frame>
    )
  }

  if (order.status === 'rejected') {
    return (
      <Frame title="Pedido recusado">
        <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-4 text-center" role="alert" data-testid="order-rejected">
          <CircleAlertGlyph className="size-12 text-destructive" aria-hidden="true" />
          <p className="text-lg font-bold">Pedido recusado</p>
          <p className="max-w-sm text-sm text-muted-foreground">{order.failureReason ?? 'O pagamento não foi aprovado.'} Nada foi cobrado e seus itens continuam no carrinho.</p>
          <Link to="/cart" className={buttonVariants()}>Voltar ao carrinho</Link>
        </div>
        <Lines order={order} />
      </Frame>
    )
  }

  return (
    <Frame title="Pedido confirmado">
      <div className="flex flex-col items-center gap-3 border-b border-primary px-8 pt-10 pb-5 text-center">
        <ThankYouIcon className="size-20 text-primary" />
        <p className="text-base font-bold text-text-secondary" data-testid="order-confirmed">Seus NFTs agora estão na sua carteira</p>
      </div>
      {/* Four auto-width cells on one line, as in the frame (14px; each label and value fits on a single line). */}
      <dl className="grid grid-cols-2 gap-y-3 border-b border-primary px-6 py-3 text-sm leading-5 md:grid-cols-[repeat(4,auto)] md:justify-between md:divide-x md:divide-primary md:px-5 [&>div]:px-3 md:[&>div]:px-4">
        <div><dt className="font-bold text-muted-foreground">ID da transação</dt><dd data-testid="receipt-hash" title={order.transactionHash ?? undefined}>{order.transactionHash ? shortHash(order.transactionHash) : '—'}</dd></div>
        <div><dt className="text-muted-foreground">Data</dt><dd>{formatDate(order.updatedAt)}</dd></div>
        <div><dt className="text-muted-foreground">Total</dt><dd>{formatEth(order.total)}</dd></div>
        <div><dt className="font-bold text-muted-foreground">Carteira</dt><dd>{WALLET_PROVIDER_LABELS[order.wallet.provider]}</dd></div>
      </dl>
      <Lines order={order} />
      <p className="px-11 py-4 text-center text-sm leading-[22px] text-text-secondary">Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede.</p>
      <div className="flex justify-center pb-8">
        <Dialog>
          <DialogTrigger asChild><Button>Ver no Etherscan</Button></DialogTrigger>
          <DialogContent>
            <DialogTitle>Explorador simulado</DialogTitle>
            <DialogDescription>Esta demonstração não usa blockchain real. A referência abaixo é simulada e não existe em nenhuma rede.</DialogDescription>
            <p className="font-mono text-xs break-all" data-testid="explorer-hash">{order.transactionHash}</p>
          </DialogContent>
        </Dialog>
      </div>
    </Frame>
  )
}

import { TriangleAlertGlyph } from '@/components/icons/glyphs'
import { NftImage } from '@/components/NftImage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { NETWORK_LABELS } from '@/contracts/common'
import type { Quote } from '@/contracts/cart'
import type { Wallet } from '@/contracts/wallet'
import { WALLET_PROVIDER_LABELS } from '@/contracts/common'
import { formatEth } from '@/lib/eth'
import { TotalsRows } from '@/features/cart/Totals'

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  quote: Quote
  /** Quote whose figures the user is about to confirm vs. the previous one, when values changed. */
  previousTotal: string | null
  liveVersion: string | undefined
  onRefresh: () => void
  wallet: Wallet
  pending: boolean
  error: string | null
  onConfirm: () => void
}

export function ReviewDialog({ open, onOpenChange, quote, previousTotal, liveVersion, onRefresh, wallet, pending, error, onConfirm }: ReviewDialogProps) {
  const outdated = liveVersion !== undefined && liveVersion !== quote.version
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revise seu pedido</DialogTitle>
          <DialogDescription>Confira os valores antes de enviar. A cotação da API é a referência final.</DialogDescription>
        </DialogHeader>

        {previousTotal && (
          <p role="alert" data-testid="quote-changed" className="flex gap-2 rounded-sm border border-primary p-3 text-sm">
            <TriangleAlertGlyph className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden="true" />
            <span>Os valores mudaram: o total era {formatEth(previousTotal)} e agora é {formatEth(quote.total)}. Revise e confirme novamente.</span>
          </p>
        )}
        {outdated && !previousTotal && (
          <p role="alert" data-testid="quote-outdated" className="rounded-sm border border-primary p-3 text-sm">
            Os valores foram atualizados enquanto você revisava.{' '}
            <button type="button" onClick={onRefresh} className="cursor-pointer font-bold text-highlight underline">Atualizar valores</button>
          </p>
        )}
        {error && <p role="alert" className="rounded-sm border border-destructive p-3 text-sm text-destructive">{error}</p>}

        <ul className="space-y-2" aria-label="Itens do pedido">
          {quote.lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3 bg-background p-2">
              <div className="w-12 shrink-0"><NftImage artwork={line.artwork} alt="" sizes="48px" size={160} className="rounded-sm" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{line.name}</p>
                <p className="text-xs text-muted-foreground">Edição {line.editionLabel} · × {line.quantity}</p>
              </div>
              <p className="text-sm font-bold text-highlight">{formatEth(line.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <TotalsRows quote={quote} loading={false} />
        <p className="text-xs text-muted-foreground">
          Pagamento com {WALLET_PROVIDER_LABELS[wallet.provider]} ({wallet.nickname}) na rede {NETWORK_LABELS[quote.network]}.
        </p>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button disabled={pending || outdated || !quote.purchasable} onClick={onConfirm}>
            {pending ? 'Enviando…' : previousTotal ? 'Confirmar com novos valores' : 'Enviar pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

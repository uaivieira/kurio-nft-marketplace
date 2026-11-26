import { Trans, useTranslation } from 'react-i18next'
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
  previousTotal: string | null
  liveVersion: string | undefined
  onRefresh: () => void
  wallet: Wallet
  pending: boolean
  error: string | null
  onConfirm: () => void
}

export function ReviewDialog({ open, onOpenChange, quote, previousTotal, liveVersion, onRefresh, wallet, pending, error, onConfirm }: ReviewDialogProps) {
  const { t } = useTranslation()
  const outdated = liveVersion !== undefined && liveVersion !== quote.version
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('checkout.review.title')}</DialogTitle>
          <DialogDescription>{t('checkout.review.description')}</DialogDescription>
        </DialogHeader>

        {previousTotal && (
          <p role="alert" data-testid="quote-changed" className="flex gap-2 rounded-sm border border-primary p-3 text-sm">
            <TriangleAlertGlyph className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden="true" />
            <span>{t('checkout.review.changed', { previous: formatEth(previousTotal), total: formatEth(quote.total) })}</span>
          </p>
        )}
        {outdated && !previousTotal && (
          <p role="alert" data-testid="quote-outdated" className="rounded-sm border border-primary p-3 text-sm">
            <Trans i18nKey="checkout.review.outdated" components={{ button: <button type="button" onClick={onRefresh} className="cursor-pointer font-bold text-highlight underline" /> }} />
          </p>
        )}
        {error && <p role="alert" className="rounded-sm border border-destructive p-3 text-sm text-destructive">{error}</p>}

        <ul className="space-y-2" aria-label={t('checkout.lines')}>
          {quote.lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3 bg-background p-2">
              <div className="w-12 shrink-0"><NftImage artwork={line.artwork} alt="" sizes="48px" size={160} className="rounded-sm" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{line.name}</p>
                <p className="text-xs text-muted-foreground">{t('checkout.review.line', { edition: line.editionLabel, quantity: line.quantity })}</p>
              </div>
              <p className="text-sm font-bold text-highlight">{formatEth(line.lineTotal)}</p>
            </li>
          ))}
        </ul>
        <TotalsRows quote={quote} loading={false} />
        <p className="text-xs text-muted-foreground">
          {t('checkout.review.payment', { provider: WALLET_PROVIDER_LABELS[wallet.provider], nickname: wallet.nickname, network: NETWORK_LABELS[quote.network] })}
        </p>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>{t('common.back')}</Button>
          <Button disabled={pending || outdated || !quote.purchasable} onClick={onConfirm}>
            {pending ? t('checkout.review.sending') : previousTotal ? t('checkout.review.confirmNew') : t('checkout.review.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

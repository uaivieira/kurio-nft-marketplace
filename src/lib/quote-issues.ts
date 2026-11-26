import type { QuoteIssue } from '@/contracts/cart'
import i18n from '@/i18n'

export const issueMessage = ({ kind, details }: QuoteIssue) =>
  i18n.t(`cart.issues.${kind}`, { name: details.name, edition: details.edition, available: details.available, from: details.previousPrice, to: details.price })

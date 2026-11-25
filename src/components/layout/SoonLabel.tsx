import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Out-of-scope destinations (editorial, support, offers...) are shown but inert and
 * labelled, so nothing pretends to work.
 */
export function SoonLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span aria-disabled="true" title="Em breve" className={cn('inline-block cursor-not-allowed', className)}>
      {children}
      <span className="sr-only"> (em breve)</span>
    </span>
  )
}

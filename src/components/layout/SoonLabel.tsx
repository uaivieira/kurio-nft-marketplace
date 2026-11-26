import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function SoonLabel({ children, className }: { children: ReactNode; className?: string }) {
  const { t } = useTranslation()
  return (
    <span aria-disabled="true" title={t('common.soon')} className={cn('inline-block cursor-not-allowed', className)}>
      {children}
      <span className="sr-only">{` ${t('common.soonSr')}`}</span>
    </span>
  )
}

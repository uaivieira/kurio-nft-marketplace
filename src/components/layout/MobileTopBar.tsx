import { useRouter } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@/components/icons'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function MobileTopBar({ title, action, className }: { title?: string; action?: ReactNode; className?: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <div className={cn('flex items-center px-7 pt-8 pb-2 md:hidden', className)}>
      <button type="button" onClick={() => router.history.back()} aria-label={t('common.back')} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-card text-primary">
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
      </button>
      {title && <p className="flex-1 pr-3 text-center text-xl font-bold">{title}</p>}
      {action && <div className="ml-auto flex size-9 items-center justify-center">{action}</div>}
    </div>
  )
}

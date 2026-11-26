import { useRouter } from '@tanstack/react-router'
import { ArrowLeftIcon } from '@/components/icons'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export function MobileTopBar({ title, action }: { title?: string; action?: ReactNode }) {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <div className="flex h-14 items-center justify-between px-6 pt-6 pb-2 md:hidden">
      <button type="button" onClick={() => router.history.back()} aria-label={t('common.back')} className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-card text-primary">
        <ArrowLeftIcon className="size-5" aria-hidden="true" />
      </button>
      {title && <p className="text-lg font-bold">{title}</p>}
      <div className="flex size-10 items-center justify-center">{action}</div>
    </div>
  )
}

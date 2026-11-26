import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { useCatalogPath, type CatalogSearch } from './search'
import { scrollToElement } from '@/lib/scroll-to-element'
import type { MouseEvent as ReactMouseEvent } from 'react'

const itemClass = (active: boolean) =>
  cn('flex size-[35px] items-center justify-center rounded-[4px] border text-lg', active ? 'border-primary bg-primary font-bold text-primary-foreground' : 'border-border hover:bg-primary/15')

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const { t } = useTranslation()
  const path = useCatalogPath()
  const scrollAfterNavigation = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    window.setTimeout(() => scrollToElement(document.getElementById('catalogo')), 0)
  }
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return (
    <nav aria-label={t('catalog.pagination.label')} className="mt-10 flex justify-center gap-2 md:mt-[75.5px] md:justify-end">
      {page > 1 && (
        <Link to={path} search={(prev: CatalogSearch) => ({ ...prev, page: page - 1 === 1 ? undefined : page - 1 })} resetScroll={false} onClick={scrollAfterNavigation} aria-label={t('catalog.pagination.previous')} className={itemClass(false)}>
          <ChevronLeftIcon className="size-[18px]" aria-hidden="true" />
        </Link>
      )}
      {pages.map((value) => (
        <Link key={value} to={path} search={(prev: CatalogSearch) => ({ ...prev, page: value === 1 ? undefined : value })} resetScroll={false} onClick={scrollAfterNavigation} aria-label={t('catalog.pagination.page', { page: value })} aria-current={value === page ? 'page' : undefined} className={itemClass(value === page)}>
          {value}
        </Link>
      ))}
      {page < totalPages && (
        <Link to={path} search={(prev: CatalogSearch) => ({ ...prev, page: page + 1 })} resetScroll={false} onClick={scrollAfterNavigation} aria-label={t('catalog.pagination.next')} className={itemClass(false)}>
          <ChevronRightIcon className="size-[18px]" aria-hidden="true" />
        </Link>
      )}
    </nav>
  )
}

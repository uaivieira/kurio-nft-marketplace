import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { useCatalogPath, type CatalogSearch } from './search'

/** 35px squares, 8px apart, right-aligned under the grid (Figma "Pagination"). */
const itemClass = (active: boolean) =>
  cn('flex size-[35px] items-center justify-center rounded-sm border border-primary text-base', active ? 'bg-primary font-medium text-primary-foreground' : 'hover:bg-primary/15')

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const path = useCatalogPath()
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return (
    <nav aria-label="Paginação do catálogo" className="mt-10 flex justify-center gap-2 md:mt-[88px] md:justify-end">
      {page > 1 && (
        <Link to={path} search={(prev: CatalogSearch) => ({ ...prev, page: page - 1 === 1 ? undefined : page - 1 })} hash="catalogo" aria-label="Página anterior" className={itemClass(false)}>
          <ChevronLeftIcon className="size-[18px]" aria-hidden="true" />
        </Link>
      )}
      {pages.map((value) => (
        <Link key={value} to={path} search={(prev: CatalogSearch) => ({ ...prev, page: value === 1 ? undefined : value })} hash="catalogo" aria-label={`Página ${value}`} aria-current={value === page ? 'page' : undefined} className={itemClass(value === page)}>
          {value}
        </Link>
      ))}
      {page < totalPages && (
        <Link to={path} search={(prev: CatalogSearch) => ({ ...prev, page: page + 1 })} hash="catalogo" aria-label="Próxima página" className={itemClass(false)}>
          <ChevronRightIcon className="size-[18px]" aria-hidden="true" />
        </Link>
      )}
    </nav>
  )
}

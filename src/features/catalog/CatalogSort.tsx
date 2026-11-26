import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from '@/components/icons'
import { CATALOG_SORTS } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { useCatalogPath, type CatalogSearch } from './search'

type CatalogSortValue = (typeof CATALOG_SORTS)[number]

export function CatalogSort({ search, id, className }: { search: CatalogSearch; id: string; className?: string }) {
  const { t } = useTranslation()
  const path = useCatalogPath()
  const navigate = useNavigate()
  const sort = search.sort ?? 'recent'
  return (
    <div className={cn('min-w-0 shrink-0 items-center gap-1 text-md whitespace-nowrap', className)}>
      <label htmlFor={id}>{t('catalog.sort.label')}</label>
      <span className="relative inline-flex items-center">
        <select
          id={id}
          value={sort}
          onChange={(event) => {
            const value = event.target.value as CatalogSortValue
            void navigate({ to: path, search: (prev: CatalogSearch) => ({ ...prev, sort: value === 'recent' ? undefined : value, page: undefined }), hash: 'catalogo' })
          }}
          className="h-6 max-w-full cursor-pointer appearance-none bg-transparent pr-5 text-md text-foreground"
        >
          {CATALOG_SORTS.map((value) => (
            <option key={value} value={value} className="bg-card">{t(`catalog.sort.${value}`)}</option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-0 size-4" />
      </span>
    </div>
  )
}

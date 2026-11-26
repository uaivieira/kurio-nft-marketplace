import { Link, useNavigate } from '@tanstack/react-router'
import { RefreshGlyph } from '@/components/icons/glyphs'
import { ChevronDownIcon, FilterIcon, SearchIcon } from '@/components/icons'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NftImage } from '@/components/NftImage'
import { MobileNav } from '@/components/layout/MobileNav'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CATALOG_PAGE_SIZE, CATALOG_SORTS, CATALOG_TABS, type CatalogQuery } from '@/contracts/nft'
import { interpolate } from '@/i18n/interpolate'
import { errorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'
import { useReveal } from '@/lib/use-reveal'
import { useCatalog } from '@/queries/catalog'
import { CatalogFilters } from './CatalogFilters'
import { CatalogPagination } from './CatalogPagination'
import { Journal, PromoBanners } from './Editorial'
import { Hero } from './Hero'
import { NftCard, NftCardSkeleton } from './NftCard'
import { hasActiveFilters, useCatalogPath, type CatalogSearch } from './search'

const FiltersSheet = lazy(() => import('./FiltersSheet'))

function SearchField({ search }: { search: CatalogSearch }) {
  const { t } = useTranslation()
  const path = useCatalogPath()
  const navigate = useNavigate()
  const [value, setValue] = useState(search.q ?? '')

  const [syncedQ, setSyncedQ] = useState(search.q)
  if (search.q !== syncedQ) {
    setSyncedQ(search.q)
    setValue(search.q ?? '')
  }
  useEffect(() => {
    const next = value.trim() || undefined
    if (next === search.q) return
    const timer = setTimeout(() => void navigate({ to: path, search: (prev: CatalogSearch) => ({ ...prev, q: next, page: undefined }), hash: 'catalogo' }), 350)
    return () => clearTimeout(timer)
  }, [value, search.q, navigate, path])

  return (
    <div role="search" className="relative flex-1">
      <label htmlFor="catalog-search" className="sr-only">{t('catalog.search.label')}</label>
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-primary" aria-hidden="true" />
      <input
        id="catalog-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={80}
        placeholder={t('catalog.search.placeholder')}
        className="h-[45px] w-full rounded-xl bg-card pr-3 pl-10 text-sm font-bold placeholder:font-bold placeholder:text-muted-foreground md:h-10 md:rounded-sm md:border md:border-input md:bg-background md:font-normal md:placeholder:font-normal"
      />
    </div>
  )
}

function ResultsGrid({ search, query }: { search: CatalogSearch; query: CatalogQuery }) {
  const { t } = useTranslation()
  const path = useCatalogPath()
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useCatalog(query)
  const reveal = useReveal(isPending)

  if (isError && !data) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 bg-card px-5 py-16 text-center">
        <p className="font-bold">{t('catalog.loadError')}</p>
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button onClick={() => void refetch()}>
          <RefreshGlyph aria-hidden="true" /> {t('common.tryAgain')}
        </Button>
      </div>
    )
  }

  if (isPending) {
    return (
      <div aria-busy="true" aria-label={t('catalog.loading')} role="status" data-testid="catalog-skeleton" className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[72px]">
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, i) => (
          <NftCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 bg-card px-5 py-16 text-center" data-testid="catalog-empty">
        <p className="font-bold">{t('catalog.empty.title')}</p>
        <p className="text-sm text-muted-foreground">{hasActiveFilters(search) ? t('catalog.empty.filtered') : t('catalog.empty.catalog')}</p>
        {hasActiveFilters(search) && (
          <Link to={path} hash="catalogo" className="font-bold text-highlight underline">{t('catalog.filters.clear')}</Link>
        )}
      </div>
    )
  }

  return (
    <>
      <p role="status" className="sr-only">{interpolate((slots) => t('catalog.results', slots), { total: data.total, page: data.page, totalPages: data.totalPages })}</p>
      {isError && (
        <p role="alert" className="mb-4 bg-card px-4 py-2 text-sm text-destructive">{t('catalog.refreshError')}</p>
      )}
      <ul
        aria-busy={isFetching}
        data-testid="catalog-grid"
        className={cn(reveal, 'grid grid-cols-2 gap-x-4 gap-y-8 transition-opacity duration-200 md:grid-cols-3 md:gap-x-[34px] md:gap-y-[72px] [&>li:nth-child(even)]:mt-8 md:[&>li:nth-child(even)]:mt-0', isPlaceholderData && 'opacity-60')}
      >
        {data.items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard nft={nft} priority={index === 0} />
          </li>
        ))}
      </ul>
      <CatalogPagination page={data.page} totalPages={data.totalPages} />
    </>
  )
}

export function HomePage({ search, variant = 'home' }: { search: CatalogSearch; variant?: 'home' | 'market' }) {
  const { t } = useTranslation()
  const path = useCatalogPath()
  const navigate = useNavigate()
  const home = variant === 'home'
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filtersLoaded, setFiltersLoaded] = useState(false)
  const filtersButton = useRef<HTMLButtonElement>(null)
  const query: CatalogQuery = search
  const { data } = useCatalog(query)
  const tab = search.tab ?? 'all'
  const sort = search.sort ?? 'recent'

  return (
    <>
      <div className="mx-auto flex max-w-page items-center gap-2 px-6 pt-10 md:gap-3 md:px-5 md:pt-8 lg:hidden">
        <SearchField search={search} />
        <button type="button" aria-haspopup="dialog" aria-expanded={filtersOpen} ref={filtersButton} onClick={() => { setFiltersLoaded(true); setFiltersOpen(true) }} aria-label={t('catalog.filters.open')} className="flex size-[45px] shrink-0 cursor-pointer items-center justify-center rounded-xl bg-cta text-primary-foreground md:size-12 md:bg-none md:bg-primary/30 md:text-primary">
              <FilterIcon className="size-5" aria-hidden="true" />
            </button>
        {filtersLoaded && (
          <Suspense fallback={null}>
            <FiltersSheet open={filtersOpen} onOpenChange={setFiltersOpen} search={search} facets={data?.facets} returnFocus={() => filtersButton.current?.focus()} />
          </Suspense>
        )}
      </div>

      <Hero />

      <div id="catalogo" className="mx-auto mt-4 grid max-w-page scroll-mt-4 gap-8 px-6 pb-24 md:mt-24 md:px-5 lg:mt-[90px] md:pb-0 lg:grid-cols-[310px_1fr] lg:gap-12">
        <aside className="hidden space-y-6 lg:block" aria-label={t('catalog.filters.aside')}>
          <CatalogFilters search={search} facets={data?.facets} />
          {home && (data?.featured ? (
            <Link to="/nft/$nftId" params={{ nftId: data.featured.id }} className="relative block overflow-hidden bg-gradient-to-b from-card to-transparent pt-6">
              <p className="px-5 text-2xl leading-8 font-bold text-highlight uppercase">{t('catalog.featured.title')}</p>
              <p className="mt-4 px-5 text-center text-base font-bold">{t('catalog.featured.offer')}</p>
              <NftImage artwork={data.featured.artwork} alt={t('catalog.featured.alt', { name: data.featured.name })} sizes="310px" className="mt-4 aspect-[310/368] rounded-2xl" />
              <span className="sr-only">{data.featured.name}</span>
            </Link>
          ) : (
            <Skeleton className="h-96 w-full" />
          ))}
        </aside>

        <section aria-labelledby="catalog-title" className="min-w-0">
          <h2 id="catalog-title" className="sr-only">{t('catalog.title')}</h2>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pb-4 md:mb-8 md:min-h-[18px] md:items-start md:pb-0 xl:h-[18px]">
            <div role="tablist" aria-label={t('catalog.tabs.label')} className="flex max-w-full gap-2.5 overflow-x-auto text-sm md:gap-5 md:text-md">
              {CATALOG_TABS.map((value) => (
                <button
                  key={value}
                  role="tab"
                  type="button"
                  aria-selected={tab === value}
                  onClick={() => void navigate({ to: path, search: (prev: CatalogSearch) => ({ ...prev, tab: value === 'all' ? undefined : value, page: undefined }), hash: 'catalogo' })}
                  className={cn('-mb-px cursor-pointer border-b-2 pb-[3px] leading-4 whitespace-nowrap', tab === value ? 'border-primary font-medium text-highlight' : 'border-transparent')}
                >
                  {t(`catalog.tabs.${value}`)}
                </button>
              ))}
            </div>
            <div className="hidden shrink-0 items-center gap-1 text-md whitespace-nowrap md:flex">
              <label htmlFor="catalog-sort">{t('catalog.sort.label')}</label>
              <span className="relative inline-flex items-center">
                <select
                  id="catalog-sort"
                  value={sort}
                  onChange={(event) => void navigate({ to: path, search: (prev: CatalogSearch) => ({ ...prev, sort: event.target.value === 'recent' ? undefined : (event.target.value as (typeof CATALOG_SORTS)[number]), page: undefined }), hash: 'catalogo' })}
                  className="h-6 cursor-pointer appearance-none bg-transparent pr-5 text-md text-foreground"
                >
                  {CATALOG_SORTS.map((value) => (
                    <option key={value} value={value} className="bg-card">{t(`catalog.sort.${value}`)}</option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-0 size-4" />
              </span>
            </div>
          </div>
          <ResultsGrid search={search} query={query} />
        </section>
      </div>

      {home && (
        <>
          <PromoBanners />
          <Journal />
        </>
      )}
      <MobileNav />
    </>
  )
}

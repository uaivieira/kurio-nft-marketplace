import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { NETWORK_LABELS, type Network } from '@/contracts/common'
import { COLLECTION_LABEL_KEYS, type CatalogPage, type Collection } from '@/contracts/nft'
import i18n from '@/i18n'
import { interpolate } from '@/i18n/interpolate'
import { cn } from '@/lib/utils'
import { hasActiveFilters, useCatalogPath, type CatalogSearch } from './search'

type Facets = CatalogPage['facets']

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

const optionClass = (active: boolean) =>
  cn('flex h-10 w-full cursor-pointer items-center justify-between rounded-sm pl-3 text-left text-md transition-colors hover:bg-primary/10', active ? 'text-highlight' : 'text-text-secondary')

const formatPrice = (value: number) => new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(value)

export function CatalogFilters({ search, facets, onApplied }: { search: CatalogSearch; facets: Facets | undefined; onApplied?: () => void }) {
  const { t } = useTranslation()
  const path = useCatalogPath()
  const navigate = useNavigate()
  const floor = Number(facets?.priceRange.min ?? 0.02)
  const ceiling = Number(facets?.priceRange.max ?? 12.3)
  const [range, setRange] = useState<[number, number]>([Number(search.minPrice ?? floor), Number(search.maxPrice ?? ceiling)])

  const rangeKey = `${search.minPrice}|${search.maxPrice}|${floor}|${ceiling}`
  const [syncedKey, setSyncedKey] = useState(rangeKey)
  if (rangeKey !== syncedKey) {
    setSyncedKey(rangeKey)
    setRange([Number(search.minPrice ?? floor), Number(search.maxPrice ?? ceiling)])
  }

  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({ to: path, search: (prev: CatalogSearch) => ({ ...prev, ...patch, page: undefined }), hash: 'catalogo' })
    onApplied?.()
  }

  const count = (list: { value: string; count: number }[] | undefined, value: string) => list?.find((entry) => entry.value === value)?.count

  return (
    <div className="space-y-[34px] bg-card px-5 pt-3.5 pb-5 text-md">
      <fieldset>
        <legend className="mb-1.5 text-lg font-bold">{t('common.collections')}</legend>
        <ul>
          {(Object.keys(COLLECTION_LABEL_KEYS) as Collection[]).map((value) => {
            const active = Boolean(search.collections?.includes(value))
            return (
              <li key={value}>
                <button type="button" aria-pressed={active} onClick={() => update({ collections: toggle(search.collections, value) })} className={cn(optionClass(active), 'pr-3')}>
                  <span>{t(COLLECTION_LABEL_KEYS[value])}</span>
                  <span className="font-bold">({count(facets?.collections, value) ?? '–'})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-lg font-bold">{t('catalog.filters.priceRange')}</legend>
        <Slider
          min={floor}
          max={ceiling}
          step={0.01}
          value={range}
          onValueChange={(value) => setRange([value[0] ?? floor, value[1] ?? ceiling])}
          minStepsBetweenThumbs={1}
          aria-label={t('catalog.filters.priceRangeLabel')}
          className="ml-3 h-[21px] w-auto"
        />
        <p className="mt-3.5 px-3 text-foreground" aria-live="polite">
          {interpolate((slots) => t('catalog.filters.price', slots), { min: formatPrice(range[0]), max: formatPrice(range[1]) })}
        </p>
        <Button
          className="mt-3.5 ml-3 h-9 rounded-md px-3 text-base"
          onClick={() =>
            update({
              minPrice: range[0] > floor ? range[0].toFixed(2) : undefined,
              maxPrice: range[1] < ceiling ? range[1].toFixed(2) : undefined,
            })
          }
        >
          {t('common.apply')}
        </Button>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-lg font-bold">{t('catalog.filters.network')}</legend>
        <ul>
          {(Object.keys(NETWORK_LABELS) as Network[]).map((value) => {
            const active = Boolean(search.networks?.includes(value))
            return (
              <li key={value}>
                <button type="button" aria-pressed={active} onClick={() => update({ networks: toggle(search.networks, value) })} className={optionClass(active)}>
                  <span>{NETWORK_LABELS[value]}</span>
                  <span>({count(facets?.networks, value) ?? '–'})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      {hasActiveFilters(search) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => update({ collections: undefined, networks: undefined, minPrice: undefined, maxPrice: undefined, q: undefined })}
        >
          {t('catalog.filters.clear')}
        </Button>
      )}
    </div>
  )
}

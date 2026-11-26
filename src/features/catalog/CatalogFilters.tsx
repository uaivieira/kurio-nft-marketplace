import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { NETWORK_LABELS, type Network } from '@/contracts/common'
import { COLLECTION_LABELS, type CatalogPage, type Collection } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { hasActiveFilters, useCatalogPath, type CatalogSearch } from './search'

type Facets = CatalogPage['facets']

function toggle<T>(list: T[] | undefined, value: T): T[] | undefined {
  const next = list?.includes(value) ? list.filter((item) => item !== value) : [...(list ?? []), value]
  return next.length ? next : undefined
}

/** Filter rows of the Figma sidebar: Body/15 with a 40px row, indented 12px. */
const optionClass = (active: boolean) =>
  cn('flex h-10 w-full cursor-pointer items-center justify-between rounded-sm pr-2 pl-3 text-left text-md transition-colors hover:bg-primary/10', active ? 'text-highlight' : 'text-text-secondary')

export function CatalogFilters({ search, facets, onApplied }: { search: CatalogSearch; facets: Facets | undefined; onApplied?: () => void }) {
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

  /** Any filter change returns to page 1. */
  const update = (patch: Partial<CatalogSearch>) => {
    void navigate({ to: path, search: (prev: CatalogSearch) => ({ ...prev, ...patch, page: undefined }), hash: 'catalogo' })
    onApplied?.()
  }

  const count = (list: { value: string; count: number }[] | undefined, value: string) => list?.find((entry) => entry.value === value)?.count

  return (
    <div className="space-y-6 bg-card px-5 pt-5 pb-5 text-md">
      <fieldset>
        <legend className="mb-1.5 text-lg font-bold">Coleções</legend>
        <ul className="space-y-0.5">
          {(Object.keys(COLLECTION_LABELS) as Collection[]).map((value) => {
            const active = Boolean(search.collections?.includes(value))
            return (
              <li key={value}>
                <button type="button" aria-pressed={active} onClick={() => update({ collections: toggle(search.collections, value) })} className={optionClass(active)}>
                  <span>{COLLECTION_LABELS[value]}</span>
                  <span className={cn('font-bold', active ? 'text-highlight' : 'text-foreground')}>({count(facets?.collections, value) ?? '–'})</span>
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="mb-4 text-lg font-bold">Faixa de preço</legend>
        <Slider
          min={floor}
          max={ceiling}
          step={0.01}
          value={range}
          onValueChange={(value) => setRange([value[0] ?? floor, value[1] ?? ceiling])}
          minStepsBetweenThumbs={1}
          aria-label="Faixa de preço em ETH"
        />
        <p className="mt-5 px-3 text-sm" aria-live="polite">
          Preço: {range[0].toFixed(2).replace('.', ',')} - {range[1].toFixed(2).replace('.', ',')} ETH
        </p>
        <Button
          className="mt-3 ml-3 h-9 px-3 text-base"
          onClick={() =>
            update({
              minPrice: range[0] > floor ? range[0].toFixed(2) : undefined,
              maxPrice: range[1] < ceiling ? range[1].toFixed(2) : undefined,
            })
          }
        >
          Aplicar
        </Button>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-lg font-bold">Rede</legend>
        <ul className="space-y-0.5">
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
          Limpar filtros
        </Button>
      )}
    </div>
  )
}

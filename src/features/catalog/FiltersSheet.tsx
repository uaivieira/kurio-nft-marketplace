import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useTranslation } from 'react-i18next'
import type { CatalogPage } from '@/contracts/nft'
import { CatalogFilters } from './CatalogFilters'
import { CatalogSort } from './CatalogSort'
import type { CatalogSearch } from './search'

export default function FiltersSheet({ open, onOpenChange, search, facets, returnFocus }: { open: boolean; onOpenChange: (open: boolean) => void; search: CatalogSearch; facets: CatalogPage['facets'] | undefined; returnFocus: () => void }) {
  const { t } = useTranslation()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-80 max-w-[90vw] overflow-y-auto p-0"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          returnFocus()
        }}
      >
        <SheetHeader className="p-5 pb-0">
          <SheetTitle>{t('catalog.filters.sheetTitle')}</SheetTitle>
          <SheetDescription>{t('catalog.filters.sheetDescription')}</SheetDescription>
        </SheetHeader>
        <CatalogSort search={search} id="catalog-sort-sheet" className="flex px-5 pt-4 pb-2" />
        <CatalogFilters search={search} facets={facets} onApplied={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

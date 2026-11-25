import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { CatalogPage } from '@/contracts/nft'
import { CatalogFilters } from './CatalogFilters'
import type { CatalogSearch } from './search'

/** Filter drawer used below the desktop breakpoint; loaded on first open. */
export default function FiltersSheet({ open, onOpenChange, search, facets, returnFocus }: { open: boolean; onOpenChange: (open: boolean) => void; search: CatalogSearch; facets: CatalogPage['facets'] | undefined; returnFocus: () => void }) {
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
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Combine coleções, preço e rede.</SheetDescription>
        </SheetHeader>
        <CatalogFilters search={search} facets={facets} onApplied={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  )
}

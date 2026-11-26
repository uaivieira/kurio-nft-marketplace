import { cloneElement, isValidElement, lazy, Suspense, useState, type MouseEvent, type ReactElement } from 'react'

const SearchDialogPanel = lazy(() => import('./SearchDialogPanel'))

export function SearchDialog({ trigger }: { trigger: ReactElement<{ onClick?: (event: MouseEvent) => void }> }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [opener, setOpener] = useState<HTMLElement | null>(null)
  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger, { onClick: (event: MouseEvent<HTMLElement>) => { setOpener(event.currentTarget); setLoaded(true); setOpen(true) }, 'aria-haspopup': 'dialog', 'aria-expanded': open } as Record<string, unknown>)
    : trigger
  return (
    <>
      {triggerElement}
      {loaded && (
        <Suspense fallback={null}>
          <SearchDialogPanel open={open} onOpenChange={setOpen} returnFocus={() => opener?.focus()} />
        </Suspense>
      )}
    </>
  )
}

import { useNavigate } from '@tanstack/react-router'
import { SearchIcon } from '@/components/icons'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

/** Dialog body, loaded on first open (keeps the dialog runtime off the first paint). */
export default function SearchDialogPanel({ open, onOpenChange, returnFocus }: { open: boolean; onOpenChange: (open: boolean) => void; returnFocus: () => void }) {
  const navigate = useNavigate()
  const setOpen = onOpenChange

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    setOpen(false)
    void navigate({ to: '/', search: q ? { q } : {}, hash: 'catalogo' })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        onCloseAutoFocus={(event) => {
          // No Radix trigger exists (the dialog is loaded lazily), so focus goes back to the opener explicitly.
          event.preventDefault()
          returnFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>Buscar NFTs</DialogTitle>
          <DialogDescription>Procure pelo nome ou pelo ID do token.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex gap-2" role="search">
          <label htmlFor="global-search" className="sr-only">
            Buscar NFTs
          </label>
          <Input id="global-search" name="q" autoComplete="off" placeholder="Ex.: Emerald Ape ou 0042" maxLength={80} />
          <Button type="submit">
            <SearchIcon aria-hidden="true" />
            Buscar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

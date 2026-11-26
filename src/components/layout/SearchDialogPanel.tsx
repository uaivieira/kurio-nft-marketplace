import { useNavigate } from '@tanstack/react-router'
import { SearchIcon } from '@/components/icons'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

export default function SearchDialogPanel({ open, onOpenChange, returnFocus }: { open: boolean; onOpenChange: (open: boolean) => void; returnFocus: () => void }) {
  const { t } = useTranslation()
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
          event.preventDefault()
          returnFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('layout.search.title')}</DialogTitle>
          <DialogDescription>{t('layout.search.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex gap-2" role="search" toolname="search_catalog" tooldescription="Search NFTs by name or collection and open the results in the catalog.">
          <label htmlFor="global-search" className="sr-only">
            {t('layout.search.label')}
          </label>
          <Input id="global-search" name="q" toolparamdescription="Text to search for in NFT names and collections" autoComplete="off" placeholder={t('layout.search.placeholder')} maxLength={80} />
          <Button type="submit">
            <SearchIcon aria-hidden="true" />
            {t('layout.search.submit')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

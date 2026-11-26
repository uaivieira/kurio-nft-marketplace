import { RotateCcwGlyph, WrenchGlyph } from '@/components/icons/glyphs'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SCENARIOS, runtime } from './scenarios'

export function MockPanel() {
  const { t } = useTranslation()
  const [active, setActive] = useState(runtime.scenario)
  const [busy, setBusy] = useState(false)

  const choose = (id: string) => {
    window.__kurio?.setScenario(id)
    setActive(runtime.scenario)
  }

  const reset = async () => {
    setBusy(true)
    await window.__kurio?.reset()
    window.location.assign('/')
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" aria-label={t('mocks.panel')} className="fixed right-0 bottom-28 z-40 flex h-9 w-7 cursor-pointer items-center justify-center rounded-l-md border border-r-0 border-primary bg-card text-primary opacity-80 hover:opacity-100 md:bottom-3">
          <WrenchGlyph className="size-4" aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('mocks.title')}</DialogTitle>
          <DialogDescription><Trans i18nKey="mocks.active" values={{ active }} components={{ strong: <strong /> }} /></DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm">
          {SCENARIOS.map((scenario) => (
            <li key={scenario.id}>
              <label className="flex cursor-pointer gap-3 rounded-sm border border-border p-2 has-[:checked]:border-primary">
                <input type="radio" name="scenario" checked={active === scenario.id} onChange={() => choose(scenario.id)} className="mt-1 accent-[var(--primary)]" />
                <span>
                  <span className="block font-bold">{t(`mocks.scenarios.${scenario.id}.label`)} <code className="text-xs font-normal text-muted-foreground">{scenario.id}</code></span>
                  <span className="text-xs text-muted-foreground">{t(`mocks.scenarios.${scenario.id}.description`)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Button variant="outline" disabled={busy} onClick={() => void reset()}>
          <RotateCcwGlyph aria-hidden="true" /> {t('mocks.reset')}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

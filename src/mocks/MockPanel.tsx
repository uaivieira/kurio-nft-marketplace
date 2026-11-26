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
        <button type="button" aria-label={t('mocks.panel')} data-testid="mock-panel-trigger" className="fixed right-4 bottom-[111px] z-40 inline-flex size-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-lg ring-2 ring-background transition-colors hover:bg-highlight md:bottom-4 md:h-11 md:w-auto md:px-4">
          <WrenchGlyph className="size-5" aria-hidden="true" />
          <span aria-hidden="true" className="max-md:hidden">{t('mocks.trigger')}</span>
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

import { ArrowRightIcon } from '@/components/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/NftImage'
import type { Artwork } from '@/contracts/nft'
import type { TranslationKey } from '@/i18n'
import { cn } from '@/lib/utils'
import { useCatalogPath } from './search'

type SlideKey = Extract<TranslationKey, `catalog.hero.${'emerald' | 'sage' | 'golden'}.${string}`>

const SLIDES: { artwork: Artwork; title: SlideKey[]; mobileTitle?: SlideKey[]; text: SlideKey; mobileText?: SlideKey; alt: SlideKey }[] = [
  { artwork: 'emerald', title: ['catalog.hero.emerald.title1', 'catalog.hero.emerald.title2'], mobileTitle: ['catalog.hero.emerald.mobileTitle1', 'catalog.hero.emerald.mobileTitle2'], mobileText: 'catalog.hero.emerald.mobileText', text: 'catalog.hero.emerald.text', alt: 'catalog.hero.emerald.alt' },
  { artwork: 'sage', title: ['catalog.hero.sage.title1', 'catalog.hero.sage.title2'], text: 'catalog.hero.sage.text', alt: 'catalog.hero.sage.alt' },
  { artwork: 'golden', title: ['catalog.hero.golden.title1', 'catalog.hero.golden.title2'], text: 'catalog.hero.golden.text', alt: 'catalog.hero.golden.alt' },
]

export function Hero() {
  const { t } = useTranslation()
  const path = useCatalogPath()
  const [index, setIndex] = useState(0)
  const [changed, setChanged] = useState(false)
  const enter = changed ? 'animate-in fade-in duration-500 ease-out' : ''
  const slide = SLIDES[index]!
  return (
    <section aria-roledescription={t('catalog.hero.roleDescription')} aria-label={t('catalog.hero.label')} className="mx-auto max-w-page px-6 pt-4 md:px-5 lg:pt-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-card max-md:rounded-3xl max-md:bg-hero lg:grid lg:h-[450px] lg:grid-cols-[minmax(0,600px)_minmax(0,1fr)] lg:gap-6 lg:overflow-visible lg:rounded-none lg:bg-none lg:pl-10">
        <div className="relative z-10 px-3 pt-3 pb-7 pr-[40%] max-md:pr-[44%] max-md:pl-4 max-[389px]:pr-[36%]! lg:flex lg:h-[370px] lg:flex-col lg:self-center lg:p-0" aria-live="polite">
          <p className="text-xs lg:text-base">{t('catalog.hero.welcome')}</p>
          <h1 key={`title-${index}`} className={cn(enter, "mt-2 text-xl leading-tight font-bold uppercase max-md:mt-0 max-md:text-lg max-md:leading-7 max-[389px]:text-base! lg:mt-[9px] lg:text-display lg:leading-[60px]")}>
            {slide.title.map((line) => (
              <span key={line} className={cn('block', slide.mobileTitle && 'max-lg:hidden')}>{t(line)}</span>
            ))}
            {slide.mobileTitle?.map((line) => (
              <span key={line} className="block lg:hidden">{t(line)}</span>
            ))}
          </h1>
          <p className="mt-2 line-clamp-3 max-w-[557px] max-md:line-clamp-none text-xs leading-4 text-muted-foreground max-md:leading-[18px] max-md:text-text-secondary lg:mt-[18px] lg:line-clamp-none lg:text-sm lg:leading-6">
            {slide.mobileText ? (
              <>
                <span className="lg:hidden">{t(slide.mobileText)}</span>
                <span className="max-lg:hidden">{t(slide.text)}</span>
              </>
            ) : (
              t(slide.text)
            )}
          </p>
          <Link to={path} hash="catalogo" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary uppercase max-md:mt-0 max-md:flex max-md:w-fit max-md:leading-4 max-md:text-highlight lg:mt-8 lg:h-10 lg:w-[140px] lg:justify-center lg:rounded-sm lg:bg-primary lg:text-sm lg:text-primary-foreground lg:hover:bg-highlight">
            {`${t('common.explore')} `}<ArrowRightIcon className="size-4 lg:hidden" aria-hidden="true" />
          </Link>
          <div role="group" aria-label={t('catalog.hero.chooseSlide')} className="absolute bottom-1 left-1/2 flex -translate-x-1/2 max-md:bottom-0 lg:static lg:mt-auto lg:translate-x-0 lg:justify-end lg:pr-0">
            {SLIDES.map((item, position) => (
              <button
                key={item.artwork}
                type="button"
                aria-label={t('catalog.hero.slide', { position: position + 1, total: SLIDES.length })}
                aria-current={position === index}
                onClick={() => {
                  setChanged(true)
                  setIndex(position)
                }}
                className="flex size-6 cursor-pointer items-center justify-center"
              >
                <span aria-hidden="true" className={cn('size-2 rounded-full bg-primary', position === index ? 'opacity-100' : 'opacity-40 lg:opacity-100')} />
              </button>
            ))}
          </div>
        </div>
        <div key={`art-${index}`} className={cn(enter, "absolute top-4 right-4 w-[34%] max-md:top-[11px] max-md:w-[37.7%] max-[389px]:w-[32%]! lg:static lg:w-full lg:max-w-[450px] lg:self-center lg:justify-self-end")}>
          <NftImage artwork={slide.artwork} alt={t(slide.alt)} sizes="(min-width: 1024px) 450px, 45vw" size={480} priority className="rounded-2xl" />
          <div aria-hidden="true" className="absolute -bottom-2 -left-3 w-[45%] rounded-xl border-2 border-card max-md:-bottom-[7px] max-md:left-4 max-md:w-[40.5%] lg:hidden">
            <NftImage artwork="sage" alt="" sizes="60px" size={160} className="rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

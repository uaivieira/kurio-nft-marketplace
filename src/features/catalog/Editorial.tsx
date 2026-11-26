import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRightIcon } from '@/components/icons'
import { NftImage } from '@/components/NftImage'
import { SoonLabel } from '@/components/layout/SoonLabel'
import type { Artwork } from '@/contracts/nft'
import { cn } from '@/lib/utils'

const POSTS = [
  { artwork: 'ivory', id: 'ownership' },
  { artwork: 'emerald', id: 'artists' },
  { artwork: 'sage', id: 'rarity' },
  { artwork: 'golden', id: 'wallet' },
] as const satisfies readonly { artwork: Artwork; id: string }[]

const PROMOS = [
  { artwork: 'emerald', id: 'genesis', tab: 'new', copy: 'pr-7.5', title: 'max-w-[230px]' },
  { artwork: 'ivory', id: 'curated', tab: 'trending', copy: 'pr-[35px]', title: '' },
] as const satisfies readonly { artwork: Artwork; id: string; tab: 'new' | 'trending'; copy: string; title: string }[]

export function PromoBanners() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('catalog.promos.label')} className="mx-auto mt-24 hidden max-w-page gap-7 px-5 md:grid lg:grid-cols-2">
      {PROMOS.map((banner) => (
        <div key={banner.id} className="relative flex h-[250px] overflow-hidden rounded-lg bg-card">
          <NftImage artwork={banner.artwork} alt="" sizes="290px" className="aspect-auto h-[250px] w-[290px] lg:max-xl:w-[220px] shrink-0 rounded-[17.5px]" />
          <span aria-hidden="true" className="absolute top-[134px] -left-[199px] size-64 rounded-full border border-primary" />
          <span aria-hidden="true" className="absolute top-[142px] -left-[191px] size-64 rounded-full border-2 border-primary" />
          <div className={cn('flex flex-1 flex-col items-end pt-[37px] text-right', banner.copy)}>
            <h2 className={cn('text-lg leading-6 font-bold', banner.title)}>{t(`catalog.promos.${banner.id}.title`)}</h2>
            <p className="mt-[9px] line-clamp-3 text-sm leading-6 text-text-secondary">{t(`catalog.promos.${banner.id}.text`)}</p>
            <Link to="/" search={{ tab: banner.tab }} hash="catalogo" className="-mt-0.5 inline-flex h-10 w-[140px] shrink-0 items-center justify-center gap-1 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-highlight">
              {`${t('common.explore')} `}<ArrowRightIcon className="size-[18px]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ))}
    </section>
  )
}

export function Journal() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="journal-title" className="mx-auto mt-24 hidden max-w-page px-5 md:block lg:mt-[97px]">
      <h2 id="journal-title" className="text-center text-title font-bold">{t('catalog.journal.title')}</h2>
      <p className="mt-3 text-center text-sm text-text-secondary">{t('catalog.journal.text')}</p>
      <ul className="mt-10 grid grid-cols-2 gap-6 lg:mt-[38px] lg:flex">
        {POSTS.map((post) => (
          <li key={post.id} className="overflow-hidden rounded-lg bg-card lg:w-[268px]">
            <NftImage artwork={post.artwork} alt="" sizes="268px" className="aspect-auto h-[195px]" />
            <div className="h-[174px] px-4 pt-3">
              <p className="text-xs leading-4 font-medium text-text-secondary">{t(`catalog.journal.${post.id}.date`)} &nbsp;|&nbsp; {t(`catalog.journal.${post.id}.read`)}</p>
              <h3 className="mt-2 text-base leading-[21px] font-bold">{t(`catalog.journal.${post.id}.title`)}</h3>
              <p className="mt-2 text-xs leading-4 font-medium text-text-secondary">{t(`catalog.journal.${post.id}.text`)}</p>
              <SoonLabel className="mt-[7px] text-xs font-bold text-highlight">{t('catalog.journal.readMore')}<span aria-hidden="true" className="relative top-px ml-[4.4px] font-normal">{t('catalog.journal.readMoreArrow')}</span></SoonLabel>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

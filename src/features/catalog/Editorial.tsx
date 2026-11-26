import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRightIcon } from '@/components/icons'
import { NftImage } from '@/components/NftImage'
import { SoonLabel } from '@/components/layout/SoonLabel'
import type { Artwork } from '@/contracts/nft'

const POSTS = [
  { artwork: 'ivory', id: 'ownership' },
  { artwork: 'emerald', id: 'artists' },
  { artwork: 'sage', id: 'rarity' },
  { artwork: 'golden', id: 'wallet' },
] as const satisfies readonly { artwork: Artwork; id: string }[]

const PROMOS = [
  { artwork: 'emerald', id: 'genesis', tab: 'new' },
  { artwork: 'ivory', id: 'curated', tab: 'trending' },
] as const satisfies readonly { artwork: Artwork; id: string; tab: 'new' | 'trending' }[]

export function PromoBanners() {
  const { t } = useTranslation()
  return (
    <section aria-label={t('catalog.promos.label')} className="mx-auto mt-24 hidden max-w-page gap-7 px-5 md:grid lg:grid-cols-2">
      {PROMOS.map((banner) => (
        <div key={banner.id} className="flex h-[250px] overflow-hidden rounded-sm bg-card">
          <NftImage artwork={banner.artwork} alt="" sizes="290px" className="aspect-auto h-[250px] w-[290px] lg:max-xl:w-[220px] shrink-0 rounded-2xl" />
          <div className="flex flex-1 flex-col items-end justify-center gap-3 py-5 pr-7.5 text-right">
            <h2 className="text-lg leading-6 font-bold">{t(`catalog.promos.${banner.id}.title`)}</h2>
            <p className="line-clamp-3 text-sm leading-6 text-text-secondary">{t(`catalog.promos.${banner.id}.text`)}</p>
            <Link to="/" search={{ tab: banner.tab }} hash="catalogo" className="inline-flex h-10 w-[140px] items-center justify-center gap-1 rounded-sm bg-primary text-base font-medium text-primary-foreground hover:bg-highlight">
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
    <section aria-labelledby="journal-title" className="mx-auto mt-24 hidden max-w-page px-5 md:block lg:mt-[91px]">
      <h2 id="journal-title" className="text-center text-title font-bold">{t('catalog.journal.title')}</h2>
      <p className="mt-3 text-center text-md text-text-secondary">{t('catalog.journal.text')}</p>
      <ul className="mt-10 grid grid-cols-2 gap-6 lg:flex">
        {POSTS.map((post) => (
          <li key={post.id} className="overflow-hidden rounded-md bg-card lg:w-[268px]">
            <NftImage artwork={post.artwork} alt="" sizes="268px" className="aspect-auto h-[195px] rounded-t-md" />
            <div className="h-[174px] px-4 pt-3">
              <p className="text-xs leading-4 text-text-secondary">{t(`catalog.journal.${post.id}.date`)} &nbsp;|&nbsp; {t(`catalog.journal.${post.id}.read`)}</p>
              <h3 className="mt-2 text-base leading-[21px] font-bold">{t(`catalog.journal.${post.id}.title`)}</h3>
              <p className="mt-2 text-caption leading-4 text-text-secondary">{t(`catalog.journal.${post.id}.text`)}</p>
              <SoonLabel className="mt-2.5 text-xs font-bold text-highlight">{t('catalog.journal.readMore')}</SoonLabel>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

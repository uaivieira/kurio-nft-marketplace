import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { COLLECTION_LABEL_KEYS, type Collection } from '@/contracts/nft'
import { FacebookIcon, InstagramIcon, LinkedinIcon, XBrandIcon, YoutubeIcon } from '@/components/icons'
import { SoonLabel } from './SoonLabel'

const FEATURES = [
  { letter: 'W', id: 'security' },
  { letter: 'C', id: 'creators' },
  { letter: 'D', id: 'drops' },
] as const

const HELP_LINKS = ['center', 'howToBuy', 'walletSecurity', 'marketPolicy', 'report'] as const

const FOOTER_COLLECTIONS: Collection[] = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'utilidade']
const SOCIAL = [
  { label: 'Facebook', href: 'https://www.facebook.com/', icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/', icon: InstagramIcon },
  { label: 'X', href: 'https://x.com/', icon: XBrandIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/', icon: YoutubeIcon },
]

const columnTitle = 'mb-3 text-lg font-bold lg:mb-0.5'
const columnList = 'text-sm leading-[30px]'

export function Footer() {
  const { t } = useTranslation()
  const [notice, setNotice] = useState(false)
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setNotice(true)
  }

  return (
    <footer className="mx-auto mt-24 hidden w-full max-w-page px-5 pb-6 md:block">
      <div className="grid grid-cols-2 gap-y-8 bg-card px-8 pt-8 pb-4 lg:grid-cols-[minmax(0,249fr)_minmax(0,266fr)_minmax(0,266fr)_minmax(0,341fr)] lg:grid-rows-[202px] lg:gap-y-0 lg:pr-[30px] lg:pl-12 lg:max-xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_280px] lg:max-xl:px-10">
        {FEATURES.map(({ letter, id }) => (
          <div key={id} className="pr-4 lg:border-r lg:border-primary lg:not-first:pl-4">
            <span aria-hidden="true" className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {letter}
            </span>
            <h2 className="mt-[9px] text-[17px] leading-[normal] font-bold lg:max-xl:text-[13px]">{t(`layout.footer.features.${id}.title`)}</h2>
            <p className="mt-2 text-md leading-[22px] text-text-secondary lg:max-w-[190px] lg:text-sm">{t(`layout.footer.features.${id}.text`)}</p>
          </div>
        ))}
        <div className="lg:pl-4">
          <h2 className="text-lg leading-4 font-bold">{t('layout.footer.newsletter.title')}</h2>
          <form onSubmit={onSubmit} className="mt-4 flex min-w-0 lg:relative">
            <label htmlFor="newsletter-email" className="sr-only">
              {t('layout.footer.newsletter.label')}
            </label>
            <input id="newsletter-email" type="email" placeholder={t('layout.footer.newsletter.placeholder')} className="h-10 w-0 min-w-0 flex-1 rounded-l-md bg-secondary px-3 text-md placeholder:text-muted-foreground lg:rounded-md lg:pr-[97px] lg:text-sm lg:max-xl:px-2" />
            <button type="submit" className="h-10 cursor-pointer rounded-r-md bg-primary px-4 text-lg font-bold text-primary-foreground lg:absolute lg:inset-y-0 lg:right-0 lg:w-[85px] lg:text-left lg:max-xl:px-2.5 lg:max-xl:text-base">
              {t('layout.footer.newsletter.submit')}
            </button>
          </form>
          <p className="mt-3 text-caption leading-[22px] text-text-secondary">{t('layout.footer.newsletter.text')}</p>
          {notice && (
            <p role="status" className="mt-2 text-xs text-highlight">
              {t('layout.footer.newsletter.notice')}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 items-center gap-4 bg-secondary px-8 py-5 text-sm leading-[22px] lg:h-[88px] lg:grid-cols-[repeat(3,minmax(0,302.667fr))_minmax(0,260fr)] lg:gap-0 lg:py-0 lg:pr-0">
        <span className="font-bold tracking-label">KURIO</span>
        <span className="max-w-60 lg:max-xl:max-w-[210px] lg:max-xl:text-[13px]">{t('layout.footer.tagline')}</span>
        <span>{t('layout.footer.contactEmail')}</span>
        <span>{t('layout.footer.contactPhone')}</span>
      </div>

      <div className="grid grid-cols-2 gap-y-8 bg-card px-8 pt-8 pb-9 lg:h-[236px] lg:grid-cols-[repeat(3,minmax(0,302.667fr))_minmax(232px,260fr)] lg:gap-y-0 lg:pt-[26px] lg:pr-0 xl:grid-cols-[repeat(3,minmax(0,302.667fr))_minmax(0,260fr)]">
        <nav aria-label={t('common.myProfile')}>
          <h2 className={columnTitle}>{t('common.myProfile')}</h2>
          <ul className={columnList}>
            <li><Link to="/profile" className="hover:text-highlight">{t('common.myProfile')}</Link></li>
            <li><SoonLabel>{t('layout.footer.profile.myCollection')}</SoonLabel></li>
            <li><SoonLabel>{t('common.activity')}</SoonLabel></li>
            <li><SoonLabel>{t('layout.footer.profile.creatorStudio')}</SoonLabel></li>
            <li><Link to="/favorites" className="hover:text-highlight">{t('common.favoritesList')}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t('layout.footer.help.title')}>
          <h2 className={columnTitle}>{t('layout.footer.help.title')}</h2>
          <ul className={columnList}>
            {HELP_LINKS.map((id) => (
              <li key={id}><SoonLabel>{t(`layout.footer.help.${id}`)}</SoonLabel></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t('common.collections')}>
          <h2 className={columnTitle}>{t('common.collections')}</h2>
          <ul className={columnList}>
            {FOOTER_COLLECTIONS.map((collection) => (
              <li key={collection}>
                <Link to="/" search={{ collections: [collection] }} hash="catalogo" className="hover:text-highlight">
                  {t(COLLECTION_LABEL_KEYS[collection])}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <h2 className={columnTitle}>{t('layout.footer.social')}</h2>
          <ul className="flex gap-2 lg:mt-[13px] lg:-ml-px">
            {SOCIAL.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t('common.opensInNewTab', { label })} className="flex size-8 items-center justify-center rounded-[5px] border border-primary text-xs font-bold text-primary hover:bg-primary/15">
                  <Icon className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
          <h2 className={`${columnTitle} mt-8 lg:mt-[25px] lg:mb-[4.5px]`}>{t('layout.footer.wallets')}</h2>
          <p className="flex min-h-[26px] max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-input bg-secondary px-2 py-1 text-[10px] leading-4 font-bold tracking-[0.1px] text-highlight uppercase lg:w-full lg:px-2">
            {t('layout.footer.walletList')}
          </p>
        </div>
      </div>
      <p className="pt-3 text-center text-sm leading-[normal]">{t('layout.footer.copyright')}</p>
    </footer>
  )
}

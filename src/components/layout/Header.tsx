import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { CartIcon, LogoutIcon, SearchIcon, UserIcon } from '@/components/icons'
import { useTranslation } from 'react-i18next'
import { useCart } from '@/queries/cart'
import { useSession } from '@/lib/session-store'
import { cn } from '@/lib/utils'
import { scrollToElement } from '@/lib/scroll-to-element'
import { SoonLabel } from './SoonLabel'
import { SearchDialog } from './SearchDialog'

const MARKET_PATHS = ['/mercado', '/nft', '/cart', '/checkout', '/orders']

export function CartLink({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  return (
    <Link to="/cart" aria-label={t('layout.header.cart', { count })} className={cn('relative inline-flex size-10 items-center justify-center rounded-sm', className)}>
      <CartIcon className="size-6" aria-hidden="true" />
      <span aria-hidden="true" className="absolute top-[9.5px] -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-tiny leading-none font-medium text-primary-foreground">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  )
}

export function Header() {
  const { t } = useTranslation()
  const session = useSession()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const inMarket = MARKET_PATHS.some((prefix) => pathname.startsWith(prefix))
  const home = pathname === '/'

  const navLink = (active: boolean) =>
    cn('relative flex h-full items-start pt-[3px] text-base leading-4 transition-colors hover:text-highlight', active ? 'font-bold text-highlight' : 'text-foreground')
  const underline = <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[3px] bg-primary" />

  return (
    <header className="mx-auto hidden max-w-page px-5 pt-6 md:block">
      <div className="grid h-[45px] grid-cols-[minmax(0,352px)_auto_1fr] items-stretch gap-x-6 border-b border-primary">
        <Link to="/" className="mt-2.5 self-start text-sm leading-none font-bold tracking-label" aria-label={t('layout.header.homeLabel')}>
          KURIO
        </Link>
        <nav aria-label={t('layout.header.nav')} className="flex gap-6 lg:gap-[40.5px]">
          <Link to="/" className={navLink(home)} aria-current={home ? 'page' : undefined}>
            {t('common.home')}
            {home && underline}
          </Link>
          <Link to="/mercado" hash="catalogo" className={navLink(inMarket)} aria-current={inMarket ? 'page' : undefined} onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            if (home || pathname === '/mercado') {
              if (!home && pathname === '/mercado') {
                scrollToElement(document.getElementById('catalogo'))
                return
              }
              scrollToElement(document.getElementById('catalogo'))
              return
            }
            void navigate({ to: '/mercado', resetScroll: false }).then(() => requestAnimationFrame(() => scrollToElement(document.getElementById('catalogo'))))
          }}>
            {t('common.market')}
            {inMarket && underline}
          </Link>
          <SoonLabel className="pt-[3px] text-base leading-4">{t('layout.header.creators')}</SoonLabel>
          <SoonLabel className="pt-[3px] text-base leading-4">{t('layout.header.learn')}</SoonLabel>
        </nav>
        <div className="flex items-start justify-end gap-4">
          <SearchDialog
            trigger={
              <button type="button" aria-label={t('layout.header.search')} className="-mr-3 inline-flex size-10 -translate-y-[3px] cursor-pointer items-center justify-center rounded-sm">
                <SearchIcon className="size-6" aria-hidden="true" />
              </button>
            }
          />
          <CartLink className="-translate-y-1.5" />
          {session ? (
            <Link to="/profile" aria-label={t('layout.header.profile', { name: session.user.displayName })} className="ml-4 inline-flex h-[35px] items-center gap-2 rounded-md border border-primary px-2.5 text-base font-medium">
              {session.user.avatarUrl ? (
                <img src={session.user.avatarUrl} alt="" className="size-5 rounded-full object-cover" />
              ) : (
                <UserIcon className="size-5" aria-hidden="true" />
              )}
              <span className="max-w-28 truncate">{session.user.displayName}</span>
            </Link>
          ) : (
            <Link to="/login" search={{}} className="ml-4 inline-flex h-[35px] w-[100px] items-center gap-1 rounded-md bg-primary pl-[9px] text-base font-medium text-primary-foreground hover:bg-highlight">
              <LogoutIcon className="size-5" aria-hidden="true" />
              {t('layout.header.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

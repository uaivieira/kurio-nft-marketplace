import { Link, useRouterState } from '@tanstack/react-router'
import { CartIcon, HeartFilledIcon, HomeIcon, UserFilledIcon } from '@/components/icons'
import { ScanIcon } from '@/components/icons'
import { useTranslation } from 'react-i18next'
import { useCart } from '@/queries/cart'
import { cn } from '@/lib/utils'
import { SearchDialog } from './SearchDialog'

const itemClass = (active: boolean) => cn('flex size-12 flex-col items-center justify-center rounded-full', active ? 'text-highlight' : 'text-text-secondary')

export function MobileNav() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  return (
    <nav aria-label={t('layout.mobileNav.label')} className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div aria-hidden="true" className="absolute inset-0 rounded-t-3xl bg-card [mask-image:radial-gradient(circle_at_50%_0,transparent_46px,#000_46.5px)]" />
      <div className="relative flex h-[95px] items-start pt-[26px] pr-[26px] pl-[22px]">
        <Link to="/" aria-label={t('common.home')} aria-current={pathname === '/' ? 'page' : undefined} className={itemClass(pathname === '/')}>
          <HomeIcon className="size-5" aria-hidden="true" />
        </Link>
        <Link to="/favorites" aria-label={t('common.favoritesList')} aria-current={pathname === '/favorites' ? 'page' : undefined} className={cn(itemClass(pathname === '/favorites'), 'ml-6')}>
          <HeartFilledIcon className="size-5" aria-hidden="true" />
        </Link>
        <SearchDialog
          trigger={
            <button type="button" aria-label={t('layout.mobileNav.search')} className="absolute -top-[31px] left-1/2 flex size-[65px] -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-fab text-foreground shadow-lg">
              <ScanIcon className="h-6 w-[27px]" />
            </button>
          }
        />
        <Link to="/cart" aria-label={t('layout.mobileNav.cart', { total: count })} aria-current={pathname === '/cart' ? 'page' : undefined} className={cn(itemClass(pathname === '/cart'), 'relative ml-auto')}>
          <CartIcon className="size-5" aria-hidden="true" />
          {count > 0 && (
            <span aria-hidden="true" className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
        <Link to="/profile" aria-label={t('common.myProfile')} aria-current={pathname.startsWith('/profile') ? 'page' : undefined} className={cn(itemClass(pathname.startsWith('/profile')), 'ml-3.5')}>
          <UserFilledIcon className="size-5" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}

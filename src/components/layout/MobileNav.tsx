import { Link, useRouterState } from '@tanstack/react-router'
import { CartIcon, HeartIcon, HomeIcon, UserIcon } from '@/components/icons'
import { ScanIcon } from '@/components/icons'
import { useTranslation } from 'react-i18next'
import { useCart } from '@/queries/cart'
import { cn } from '@/lib/utils'
import { SearchDialog } from './SearchDialog'

const itemClass = (active: boolean) => cn('flex size-12 flex-col items-center justify-center rounded-full', active ? 'text-primary' : 'text-muted-foreground')

export function MobileNav() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  return (
    <nav aria-label={t('layout.mobileNav.label')} className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      <div className="relative flex h-16 items-center justify-between rounded-t-3xl bg-card px-6">
        <Link to="/" aria-label={t('common.home')} aria-current={pathname === '/' ? 'page' : undefined} className={itemClass(pathname === '/')}>
          <HomeIcon className="size-6" aria-hidden="true" />
        </Link>
        <Link to="/favorites" aria-label={t('common.favoritesList')} aria-current={pathname === '/favorites' ? 'page' : undefined} className={cn(itemClass(pathname === '/favorites'), 'mr-10')}>
          <HeartIcon className="size-6" aria-hidden="true" />
        </Link>
        <SearchDialog
          trigger={
            <button type="button" aria-label={t('layout.mobileNav.search')} className="absolute -top-6 left-1/2 flex size-14 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-cta text-foreground shadow-lg">
              <ScanIcon className="h-6 w-[27px]" />
            </button>
          }
        />
        <Link to="/cart" aria-label={t('layout.mobileNav.cart', { total: count })} aria-current={pathname === '/cart' ? 'page' : undefined} className={cn(itemClass(pathname === '/cart'), 'relative ml-10')}>
          <CartIcon className="size-6" aria-hidden="true" />
          {count > 0 && (
            <span aria-hidden="true" className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Link>
        <Link to="/profile" aria-label={t('common.myProfile')} aria-current={pathname.startsWith('/profile') ? 'page' : undefined} className={itemClass(pathname.startsWith('/profile'))}>
          <UserIcon className="size-6" aria-hidden="true" />
        </Link>
      </div>
    </nav>
  )
}

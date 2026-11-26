import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIcon, DangerIcon, DiscountIcon, DownloadIcon, HeartIcon, LocationIcon, LogoutIcon, UserIcon } from '@/components/icons'
import { MobileNav } from '@/components/layout/MobileNav'
import { SoonLabel } from '@/components/layout/SoonLabel'
import { logout } from '@/lib/auth-flow'
import { cn } from '@/lib/utils'

type Icon = ComponentType<SVGProps<SVGSVGElement>>
type SoonKey = 'common.activity' | 'account.offers' | 'account.downloads' | 'account.support'
const SOON_ACTIVITY: { label: SoonKey; icon: Icon } = { label: 'common.activity', icon: ActivityIcon }
const SOON: { label: SoonKey; icon: Icon }[] = [
  { label: 'account.offers', icon: DiscountIcon },
  { label: 'account.downloads', icon: DownloadIcon },
  { label: 'account.support', icon: DangerIcon },
]

const rowClass = 'flex min-h-[45px] items-center gap-3 px-3 py-2.5 text-md whitespace-nowrap text-highlight max-md:border-b-2 md:border-l-4'
const itemClass = (active: boolean) => cn(rowClass, 'transition-colors hover:bg-primary/10', active ? 'border-primary' : 'border-transparent')

function SoonItem({ label, icon: Icon }: { label: SoonKey; icon: Icon }) {
  const { t } = useTranslation()
  return (
    <li>
      <SoonLabel className={cn(rowClass, 'border-transparent')}>
        <Icon className="size-5" aria-hidden="true" />
        {t(label)}
      </SoonLabel>
    </li>
  )
}

export function AccountLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const onLogout = async () => {
    await logout()
    void navigate({ to: '/' })
  }

  return (
    <div className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)] gap-7 px-5 pt-6 pb-28 md:grid-cols-[310px_minmax(0,1fr)] md:pt-8 md:pb-16">
      <nav aria-label={t('account.nav')} className="h-fit min-w-0 bg-card">
        <h2 className="px-2.5 pt-3 pb-2 text-lg font-bold">{t('common.myProfile')}</h2>
        <ul className="relative max-md:flex max-md:overflow-x-auto">
          <li><Link to="/profile" className={itemClass(pathname === '/profile')} aria-current={pathname === '/profile' ? 'page' : undefined}><UserIcon className="size-5" aria-hidden="true" />{t('account.profileData')}</Link></li>
          <li><Link to="/profile/wallets" className={itemClass(pathname === '/profile/wallets')} aria-current={pathname === '/profile/wallets' ? 'page' : undefined}><LocationIcon className="size-5" aria-hidden="true" />{t('account.wallets')}</Link></li>
          <SoonItem {...SOON_ACTIVITY} />
          <li><Link to="/favorites" className={itemClass(false)}><HeartIcon className="size-5" aria-hidden="true" />{t('common.favoritesList')}</Link></li>
          {SOON.map((item) => <SoonItem key={item.label} {...item} />)}
        </ul>
        <button type="button" onClick={() => void onLogout()} className="flex min-h-[45px] w-full cursor-pointer items-center gap-3 border-t border-border px-3 py-3 text-sm font-bold text-highlight hover:bg-primary/10">
          <LogoutIcon className="size-5" aria-hidden="true" />{t('account.logout')}
        </button>
      </nav>
      <div className="min-w-0"><Outlet /></div>
      <MobileNav />
    </div>
  )
}

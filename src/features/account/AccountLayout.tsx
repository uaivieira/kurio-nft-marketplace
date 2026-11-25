import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import type { ComponentType, SVGProps } from 'react'
import { ActivityIcon, DangerIcon, DiscountIcon, DownloadIcon, HeartIcon, LocationIcon, LogoutIcon, UserIcon } from '@/components/icons'
import { MobileNav } from '@/components/layout/MobileNav'
import { SoonLabel } from '@/components/layout/SoonLabel'
import { logout } from '@/lib/auth-flow'
import { cn } from '@/lib/utils'

const SOON: { label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { label: 'Atividade', icon: ActivityIcon },
  { label: 'Ofertas', icon: DiscountIcon },
  { label: 'Arquivos baixados', icon: DownloadIcon },
  { label: 'Suporte', icon: DangerIcon },
]

const itemClass = (active: boolean) =>
  cn('flex items-center gap-3 border-l-4 px-3 py-2.5 text-md text-highlight transition-colors hover:bg-primary/10', active ? 'border-primary' : 'border-transparent')

export function AccountLayout() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const onLogout = async () => {
    await logout()
    void navigate({ to: '/' })
  }

  return (
    <div className="mx-auto grid max-w-page gap-7 px-5 pt-6 pb-28 md:grid-cols-[310px_1fr] md:pt-8 md:pb-16">
      <nav aria-label="Conta" className="h-fit bg-card">
        <h2 className="px-2.5 pt-5 pb-2 text-lg font-bold">Meu perfil</h2>
        <ul className="max-md:flex max-md:flex-wrap">
          <li><Link to="/profile" className={itemClass(pathname === '/profile')} aria-current={pathname === '/profile' ? 'page' : undefined}><UserIcon className="size-4" aria-hidden="true" />Dados do perfil</Link></li>
          <li><Link to="/profile/wallets" className={itemClass(pathname === '/profile/wallets')} aria-current={pathname === '/profile/wallets' ? 'page' : undefined}><LocationIcon className="size-4" aria-hidden="true" />Carteiras</Link></li>
          <li><Link to="/favorites" className={itemClass(false)}><HeartIcon className="size-4" aria-hidden="true" />Lista de interesse</Link></li>
          {SOON.map(({ label, icon: Icon }) => (
            <li key={label}>
              <SoonLabel className="flex items-center gap-3 border-l-4 border-transparent px-3 py-2.5 text-md text-highlight">
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </SoonLabel>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => void onLogout()} className="flex w-full cursor-pointer items-center gap-3 border-t border-border px-3 py-3 text-sm font-bold text-highlight hover:bg-primary/10">
          <LogoutIcon className="size-4" aria-hidden="true" />Sair
        </button>
      </nav>
      <div className="min-w-0"><Outlet /></div>
      <MobileNav />
    </div>
  )
}

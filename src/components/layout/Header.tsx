import { Link, useRouterState } from '@tanstack/react-router'
import { CartIcon, LogoutIcon, SearchIcon, UserIcon } from '@/components/icons'
import { useCart } from '@/queries/cart'
import { useSession } from '@/lib/session-store'
import { cn } from '@/lib/utils'
import { SoonLabel } from './SoonLabel'
import { SearchDialog } from './SearchDialog'

const MARKET_PATHS = ['/mercado', '/nft', '/cart', '/checkout', '/orders']

export function CartLink({ className }: { className?: string }) {
  const { data } = useCart()
  const count = data?.itemCount ?? 0
  return (
    <Link to="/cart" aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`} className={cn('relative inline-flex size-10 items-center justify-center rounded-sm', className)}>
      <CartIcon className="size-6" aria-hidden="true" />
      <span aria-hidden="true" className="absolute top-1 right-0.5 flex size-3.5 items-center justify-center rounded-full bg-primary text-tiny font-medium text-primary-foreground">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  )
}

/** Header Row of the desktop frames: 45px row, 24px from the top, divider at the bottom. */
export function Header() {
  const session = useSession()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const inMarket = MARKET_PATHS.some((prefix) => pathname.startsWith(prefix))
  const home = pathname === '/'

  const navLink = (active: boolean) =>
    cn('relative flex h-full items-start pt-[3px] text-base leading-4 transition-colors hover:text-highlight', active ? 'font-medium text-highlight' : 'text-foreground')
  const underline = <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[3px] bg-primary" />

  return (
    <header className="mx-auto hidden max-w-page px-5 pt-6 md:block">
      {/* At 1440 the nav starts 376px into the 1200px row (Header Row), left of centre; narrower rows give the logo column less room first. */}
      <div className="grid h-[45px] grid-cols-[minmax(0,352px)_auto_1fr] items-stretch gap-x-6 border-b border-border">
        <Link to="/" className="mt-2.5 self-start text-caption leading-none font-bold tracking-label" aria-label="Kurio, página inicial">
          KURIO
        </Link>
        <nav aria-label="Principal" className="flex gap-6 lg:gap-10">
          <Link to="/" className={navLink(home)} aria-current={home ? 'page' : undefined}>
            Início
            {home && underline}
          </Link>
          <Link to="/mercado" className={navLink(inMarket)} aria-current={inMarket ? 'page' : undefined}>
            Mercado
            {inMarket && underline}
          </Link>
          <SoonLabel className="pt-[3px] text-base leading-4">Criadores</SoonLabel>
          <SoonLabel className="pt-[3px] text-base leading-4">Aprenda</SoonLabel>
        </nav>
        <div className="flex items-start justify-end gap-4">
          <SearchDialog
            trigger={
              <button type="button" aria-label="Buscar NFTs" className="inline-flex size-10 -translate-y-1.5 cursor-pointer items-center justify-center rounded-sm">
                <SearchIcon className="size-6" aria-hidden="true" />
              </button>
            }
          />
          <CartLink className="-translate-y-1.5" />
          {session ? (
            <Link to="/profile" aria-label={`Meu perfil, ${session.user.displayName}`} className="ml-4 inline-flex h-[34px] items-center gap-2 rounded-sm border border-primary px-2.5 text-base font-bold">
              {session.user.avatarUrl ? (
                <img src={session.user.avatarUrl} alt="" className="size-5 rounded-full object-cover" />
              ) : (
                <UserIcon className="size-5" aria-hidden="true" />
              )}
              <span className="max-w-28 truncate">{session.user.displayName}</span>
            </Link>
          ) : (
            <Link to="/login" search={{}} className="ml-4 inline-flex h-[34px] items-center gap-1 rounded-sm bg-primary px-2.5 text-base font-bold text-primary-foreground hover:bg-highlight">
              <LogoutIcon className="size-5" aria-hidden="true" />
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

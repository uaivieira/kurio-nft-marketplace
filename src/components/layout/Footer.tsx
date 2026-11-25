import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { COLLECTION_LABELS, type Collection } from '@/contracts/nft'
import { FacebookIcon, InstagramIcon, LinkedinIcon, XBrandIcon, YoutubeIcon } from '@/components/icons'
import { SoonLabel } from './SoonLabel'

const FEATURES = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const FOOTER_COLLECTIONS: Collection[] = ['arte-digital', 'fotografia', 'musica', 'arte-3d', 'utilidade']
const SOCIAL = [
  { label: 'Facebook', href: 'https://www.facebook.com/', icon: FacebookIcon },
  { label: 'Instagram', href: 'https://www.instagram.com/', icon: InstagramIcon },
  { label: 'X', href: 'https://x.com/', icon: XBrandIcon },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', icon: LinkedinIcon },
  { label: 'YouTube', href: 'https://www.youtube.com/', icon: YoutubeIcon },
]

const columnTitle = 'mb-3 text-lg font-bold'
const columnList = 'text-sm leading-[30px]'

/** Footer component (1200×610): features + newsletter, contact band, link columns, copyright. */
export function Footer() {
  const [notice, setNotice] = useState(false)
  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setNotice(true)
  }

  return (
    <footer className="mx-auto mt-24 hidden w-full max-w-page px-5 pb-6 md:block">
      <div className="grid grid-cols-2 gap-y-8 bg-card px-8 pt-8 pb-4 lg:grid-cols-[249px_266px_266px_1fr] lg:gap-y-0 lg:px-12">
        {FEATURES.map(({ letter, title, text }) => (
          <div key={title} className="pr-4 lg:border-r lg:border-primary lg:not-first:pl-4">
            <span aria-hidden="true" className="flex size-[74px] items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
              {letter}
            </span>
            <h2 className="mt-3 text-lg font-bold">{title}</h2>
            <p className="mt-2.5 text-md leading-[22px] text-text-secondary">{text}</p>
          </div>
        ))}
        <div className="lg:pl-4">
          <h2 className="text-lg leading-4 font-bold">Antecipe-se ao próximo lançamento</h2>
          <form onSubmit={onSubmit} className="mt-6 flex">
            <label htmlFor="newsletter-email" className="sr-only">
              E-mail para receber lançamentos
            </label>
            <input id="newsletter-email" type="email" placeholder="digite seu e-mail..." className="h-10 min-w-0 flex-1 rounded-l-sm bg-secondary px-3 text-md placeholder:text-muted-foreground" />
            <button type="submit" className="h-10 cursor-pointer rounded-r-sm bg-primary px-4 text-lg font-bold text-primary-foreground">
              Enviar
            </button>
          </form>
          <p className="mt-4 text-caption text-text-secondary">Receba lançamentos selecionados, histórias de criadores e novidades do mercado.</p>
          {notice && (
            <p role="status" className="mt-2 text-xs text-highlight">
              Inscrição indisponível nesta demonstração. Nenhum e-mail foi enviado.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 items-center gap-4 bg-secondary px-8 py-5 text-md leading-[22px] lg:h-[88px] lg:grid-cols-4 lg:py-0">
        <span className="font-bold tracking-label">KURIO</span>
        <span className="max-w-60">Feito para colecionadores, criadores e cultura</span>
        <span>contato@email.com</span>
        <span>+55 11 4002 8922</span>
      </div>

      <div className="grid grid-cols-2 gap-y-8 bg-card px-8 pt-8 pb-9 lg:grid-cols-4 lg:gap-y-0">
        <nav aria-label="Meu perfil">
          <h2 className={columnTitle}>Meu perfil</h2>
          <ul className={columnList}>
            <li><Link to="/profile" className="hover:text-highlight">Meu perfil</Link></li>
            <li><SoonLabel>Minha coleção</SoonLabel></li>
            <li><SoonLabel>Atividade</SoonLabel></li>
            <li><SoonLabel>Estúdio do criador</SoonLabel></li>
            <li><Link to="/favorites" className="hover:text-highlight">Lista de interesse</Link></li>
          </ul>
        </nav>
        <nav aria-label="Central de ajuda">
          <h2 className={columnTitle}>Central de ajuda</h2>
          <ul className={columnList}>
            {['Central de ajuda', 'Como comprar NFTs', 'Carteira e segurança', 'Política do mercado', 'Denunciar item'].map((label) => (
              <li key={label}><SoonLabel>{label}</SoonLabel></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Coleções">
          <h2 className={columnTitle}>Coleções</h2>
          <ul className={columnList}>
            {FOOTER_COLLECTIONS.map((collection) => (
              <li key={collection}>
                <Link to="/" search={{ collections: [collection] }} hash="catalogo" className="hover:text-highlight">
                  {COLLECTION_LABELS[collection]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className={columnTitle}>Redes sociais</h2>
          <ul className="flex gap-2">
            {SOCIAL.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (abre em nova aba)`} className="flex size-8 items-center justify-center rounded-sm border border-primary text-xs font-bold text-primary hover:bg-primary/15">
                  <Icon className="size-[18px]" />
                </a>
              </li>
            ))}
          </ul>
          <h2 className={`${columnTitle} mt-8`}>Carteiras compatíveis</h2>
          <p className="inline-block rounded-sm border border-primary/40 bg-secondary px-2.5 py-1.5 text-micro font-bold tracking-wide text-primary uppercase">
            MetaMask &nbsp;·&nbsp; WalletConnect &nbsp;·&nbsp; Coinbase
          </p>
        </div>
      </div>
      <p className="pt-5 text-center text-md">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

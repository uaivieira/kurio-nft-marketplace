import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from '@/components/icons'
import { NftImage } from '@/components/NftImage'
import { SoonLabel } from '@/components/layout/SoonLabel'
import type { Artwork } from '@/contracts/nft'

const POSTS: { artwork: Artwork; date: string; read: string; title: string; text: string }[] = [
  { artwork: 'ivory', date: '12 de setembro', read: 'Leitura de 6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { artwork: 'emerald', date: '13 de setembro', read: 'Leitura de 2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { artwork: 'sage', date: '15 de setembro', read: 'Leitura de 3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { artwork: 'golden', date: '15 de setembro', read: 'Leitura de 2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

const PROMOS = [
  { artwork: 'emerald' as const, title: 'Lançamentos gênesis de edição limitada', text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.', tab: 'new' as const },
  { artwork: 'ivory' as const, title: 'Arte digital selecionada e muito mais', text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.', tab: 'trending' as const },
]

/** "Promos": two 586×250 cards, 28px apart, 96px below the catalog. */
export function PromoBanners() {
  return (
    <section aria-label="Campanhas" className="mx-auto mt-24 hidden max-w-page gap-7 px-5 md:grid lg:grid-cols-2">
      {PROMOS.map((banner) => (
        <div key={banner.title} className="flex h-[250px] overflow-hidden rounded-sm bg-card">
          <NftImage artwork={banner.artwork} alt="" sizes="290px" className="aspect-auto h-[250px] w-[290px] lg:max-xl:w-[220px] shrink-0 rounded-2xl" />
          <div className="flex flex-1 flex-col items-end justify-center gap-3 py-5 pr-7.5 text-right">
            <h2 className="text-lg leading-6 font-bold">{banner.title}</h2>
            <p className="line-clamp-3 text-sm leading-6 text-text-secondary">{banner.text}</p>
            <Link to="/" search={{ tab: banner.tab }} hash="catalogo" className="inline-flex h-10 w-[140px] items-center justify-center gap-1 rounded-sm bg-primary text-base font-medium text-primary-foreground hover:bg-highlight">
              Explorar <ArrowRightIcon className="size-[18px]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ))}
    </section>
  )
}

/** "Blog": centered header (67px) and four 268px cards, 24px apart. */
export function Journal() {
  return (
    <section aria-labelledby="journal-title" className="mx-auto mt-24 hidden max-w-page px-5 md:block">
      <h2 id="journal-title" className="text-center text-title font-bold">Diário da Cunhagem</h2>
      <p className="mt-3 text-center text-md text-text-secondary">Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.</p>
      <ul className="mt-10 grid grid-cols-2 gap-6 lg:flex">
        {POSTS.map((post) => (
          <li key={post.title} className="overflow-hidden rounded-md bg-card lg:w-[268px]">
            <NftImage artwork={post.artwork} alt="" sizes="268px" className="aspect-auto h-[195px] rounded-t-md" />
            <div className="h-[174px] px-4 pt-3">
              <p className="text-xs leading-4 text-text-secondary">{post.date} &nbsp;|&nbsp; {post.read}</p>
              <h3 className="mt-2 text-base leading-[21px] font-bold">{post.title}</h3>
              <p className="mt-2 text-caption leading-4 text-text-secondary">{post.text}</p>
              <SoonLabel className="mt-2.5 text-xs font-bold text-highlight">Ler mais →</SoonLabel>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

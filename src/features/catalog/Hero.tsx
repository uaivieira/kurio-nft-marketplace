import { ArrowRightIcon } from '@/components/icons'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/NftImage'
import type { Artwork } from '@/contracts/nft'
import { cn } from '@/lib/utils'
import { useCatalogPath } from './search'

const SLIDES: { artwork: Artwork; title: string[]; mobileTitle?: string[]; text: string; mobileText?: string; alt: string }[] = [
  { artwork: 'emerald', title: ['Seja dono do futuro', 'da arte digital'], mobileTitle: ['Seja dono da', 'cultura digital'], mobileText: 'Descubra NFTs selecionados de criadores do mundo todo.', text: 'Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.', alt: 'Macaco de óculos e jaqueta verde, arte do destaque Emerald Ape' },
  { artwork: 'sage', title: ['Edições limitadas', 'para colecionadores'], text: 'Lançamentos com procedência registrada na rede e direitos autorais pagos aos criadores a cada revenda.', alt: 'Gorila de chapéu e moletom roxo, arte do destaque Sage Nomad' },
  { artwork: 'golden', title: ['Música, arte e', 'cultura em um só lugar'], text: 'Explore coleções de som, imagem e experiências digitais verificadas por uma comunidade de colecionadores.', alt: 'Macaco laranja com fones de ouvido, arte do destaque Golden Beat' },
]

/** Desktop "Hero" (1200×450): 600px text column 40px in, 450px artwork on the right. */
export function Hero() {
  const path = useCatalogPath()
  const [index, setIndex] = useState(0)
  // Crossfade only after the visitor picks a slide; the first paint (prerendered LCP) never animates.
  const [changed, setChanged] = useState(false)
  const enter = changed ? 'animate-in fade-in duration-500 ease-out' : ''
  const slide = SLIDES[index]!
  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="mx-auto max-w-page px-5 pt-4 lg:pt-8">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-card lg:grid lg:h-[450px] lg:grid-cols-[600px_1fr] lg:overflow-visible lg:rounded-none lg:bg-none lg:pl-10">
        <div className="relative z-10 px-3 pt-3 pb-7 pr-[40%] lg:flex lg:h-[364px] lg:flex-col lg:self-center lg:p-0" aria-live="polite">
          <p className="text-xs lg:text-base">Bem-vindo à Kurio</p>
          <h1 key={`title-${index}`} className={cn(enter, "mt-2 text-xl leading-tight font-bold uppercase lg:mt-1 lg:text-display lg:leading-[4.375rem]")}>
            {slide.title.map((line) => (
              <span key={line} className={cn('block', slide.mobileTitle && 'max-lg:hidden')}>{line}</span>
            ))}
            {slide.mobileTitle?.map((line) => (
              <span key={line} className="block lg:hidden">{line}</span>
            ))}
          </h1>
          <p className="mt-2 line-clamp-3 max-w-[557px] text-xs leading-4 text-muted-foreground lg:mt-1 lg:line-clamp-none lg:text-sm lg:leading-6">
            {slide.mobileText ? (
              <>
                <span className="lg:hidden">{slide.mobileText}</span>
                <span className="max-lg:hidden">{slide.text}</span>
              </>
            ) : (
              slide.text
            )}
          </p>
          <Link to={path} hash="catalogo" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary uppercase lg:mt-8 lg:h-10 lg:w-[140px] lg:justify-center lg:rounded-sm lg:bg-primary lg:text-sm lg:text-primary-foreground lg:hover:bg-highlight">
            Explorar <ArrowRightIcon className="size-4 lg:hidden" aria-hidden="true" />
          </Link>
          <div role="group" aria-label="Escolher destaque" className="absolute bottom-1 left-1/2 flex -translate-x-1/2 lg:static lg:mt-auto lg:translate-x-0 lg:justify-end lg:pr-0">
            {SLIDES.map((item, position) => (
              <button
                key={item.artwork}
                type="button"
                aria-label={`Destaque ${position + 1} de ${SLIDES.length}`}
                aria-current={position === index}
                onClick={() => {
                  setChanged(true)
                  setIndex(position)
                }}
                className="flex size-6 cursor-pointer items-center justify-center"
              >
                <span aria-hidden="true" className={cn('size-2 rounded-full bg-primary', position === index ? 'opacity-100' : 'opacity-40 lg:opacity-100')} />
              </button>
            ))}
          </div>
        </div>
        <div key={`art-${index}`} className={cn(enter, "absolute top-4 right-4 w-[34%] lg:static lg:w-[450px] lg:justify-self-end")}>
          {/* Mobile asks for the same file as the first catalog card (shared, preloaded LCP image). */}
          <NftImage artwork={slide.artwork} alt={slide.alt} sizes="(min-width: 1024px) 450px, 45vw" size={480} priority className="rounded-2xl" />
          <div aria-hidden="true" className="absolute -bottom-2 -left-3 w-[45%] rounded-xl border-2 border-card lg:hidden">
            <NftImage artwork="sage" alt="" sizes="60px" size={160} className="rounded-xl" />
          </div>
        </div>
      </div>
    </section>
  )
}

import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { NftSummary } from '@/contracts/nft'
import { NftCard } from './NftCard'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 5

export function NftCarousel({ id, title, items, size = 'related' }: { id: string; title: string; items: NftSummary[]; size?: 'compact' | 'related' }) {
  const { t } = useTranslation()
  const viewport = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const pages = Array.from({ length: Math.ceil(items.length / PAGE_SIZE) }, (_, index) => items.slice(index * PAGE_SIZE, (index + 1) * PAGE_SIZE))

  const goToPage = (nextPage: number) => {
    const next = Math.max(0, Math.min(nextPage, pages.length - 1))
    viewport.current?.scrollTo({ left: next * viewport.current.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    setPage(next)
  }

  return (
    <section aria-labelledby={`${id}-title`} className="mt-24 max-md:hidden">
      <h2 id={`${id}-title`} className="h-7 border-b border-primary text-[17px] leading-4 font-bold text-highlight">{title}</h2>
      <div
        ref={viewport}
        role="group"
        aria-label={title}
        tabIndex={0}
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth
          if (width) setPage(Math.round(event.currentTarget.scrollLeft / width))
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            goToPage(page + 1)
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            goToPage(page - 1)
          }
        }}
        className="mt-8 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pages.map((group, index) => (
          <div key={index} role="group" data-testid={`carousel-page-${index + 1}`} aria-roledescription={t('catalog.carousel.slide')} aria-label={t('catalog.carousel.page', { page: index + 1, total: pages.length })} className="min-w-full snap-start">
            <ul className="grid grid-cols-3 items-start gap-[26px] lg:grid-cols-5">
              {group.map((item) => <li key={item.id} className="min-w-0"><NftCard nft={item} sizes="(min-width: 1280px) 220px, 26vw" size={size} /></li>)}
            </ul>
          </div>
        ))}
      </div>
      {pages.length > 1 && (
        <div role="group" aria-label={t('catalog.carousel.navigation')} className="mt-5 flex justify-center gap-1">
          {pages.map((_, index) => (
            <button key={index} type="button" aria-label={t('catalog.carousel.page', { page: index + 1, total: pages.length })} aria-current={page === index ? 'page' : undefined} onClick={() => goToPage(index)} className="flex size-6 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring">
              <span aria-hidden="true" className={cn('size-2 rounded-full border border-primary transition-colors', page === index ? 'bg-primary' : 'bg-transparent')} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

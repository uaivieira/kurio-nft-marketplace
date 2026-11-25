import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'
import { MinusGlyph, PlusGlyph } from '@/components/icons/glyphs'
import { CartIcon, LinkedinIcon, MessageIcon, SearchIcon, StarIcon, XBrandIcon } from '@/components/icons'
import { useEffect, useRef, useState } from 'react'
import { notify } from '@/lib/notify'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { NftImage } from '@/components/NftImage'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Edition, NftDetail } from '@/contracts/nft'
import { FavoriteButton, NftCard } from '@/features/catalog/NftCard'
import { errorMessage, isApiError } from '@/lib/api-error'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { announce } from '@/realtime/announcer'
import { useAddToCart } from '@/queries/cart'
import { useNft } from '@/queries/catalog'
import { NotFound } from '@/components/layout/NotFound'

const defaultEdition = (editions: Edition[]) => editions.find((edition) => edition.id === 'e50' && edition.available > 0) ?? editions.find((edition) => edition.available > 0) ?? editions[0]!

export function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Carregando NFT" data-testid="detail-skeleton" className="mx-auto min-h-dvh max-w-page px-5 pt-5">
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[100px_444px_1fr] lg:gap-x-[33px]">
        <div className="hidden gap-3 lg:grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="aspect-square w-full" />)}</div>
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => <StarIcon key={i} className={cn('size-[15px]', i <= Math.round(rating) ? 'text-primary' : 'text-muted-foreground')} />)}
    </span>
  )
}

function Purchase({ nft, edition, onEditionChange }: { nft: NftDetail; edition: Edition; onEditionChange: (id: string) => void }) {
  const navigate = useNavigate()
  const addToCart = useAddToCart()
  const [requested, setQuantity] = useState(1)
  const limit = Math.min(edition.available, edition.maxPerOrder)
  const soldOut = edition.available === 0
  // Clamped on every render, so a realtime stock drop or an edition switch never leaves an invalid quantity.
  const quantity = Math.max(1, Math.min(requested, limit || 1))
  const lastPrice = useRef(edition.price)


  useEffect(() => {
    if (lastPrice.current !== edition.price) {
      announce(`O preço da edição ${edition.label} mudou para ${formatEth(edition.price)}.`)
      lastPrice.current = edition.price
    }
  }, [edition.price, edition.label])

  const submit = (goToCart: boolean) =>
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          announce(`${quantity} × ${nft.name} adicionado ao carrinho.`)
          if (goToCart) void navigate({ to: '/cart' })
          else notify.success(`${nft.name} adicionado ao carrinho.`)
        },
        onError: (error) => notify.error(errorMessage(error)),
      },
    )

  return (
    <>
      <fieldset className="mt-3">
        <legend className="mb-3 text-base leading-4 font-bold">Edição:</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Edição">
          {nft.editions.map((item) => {
            const out = item.available === 0
            const selected = item.id === edition.id
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-disabled={out}
                disabled={out}
                onClick={() => onEditionChange(item.id)}
                className={cn('h-7 cursor-pointer rounded-full border px-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-50', selected ? 'border-primary bg-primary/15 font-bold' : 'border-border hover:border-primary')}
              >
                {item.label}
                {out && <span className="sr-only"> (esgotada)</span>}
              </button>
            )
          })}
        </div>
        {soldOut && <p role="status" className="mt-2 text-xs text-destructive">Esta edição está esgotada. Escolha outra edição.</p>}
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 max-md:sticky max-md:bottom-0 max-md:z-20 max-md:order-last max-md:-mx-5 max-md:mt-6 max-md:rounded-t-[2rem] max-md:bg-card max-md:px-6 max-md:pt-6 max-md:pb-5 max-md:shadow-[0_-12px_32px_rgba(0,0,0,0.45)] md:mt-[19px] md:h-[50px]">
        <div role="group" aria-label="Quantidade" className="flex items-center gap-3">
          <span className="text-sm md:hidden">Qtd.</span>
          <button type="button" aria-label="Diminuir quantidade" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)} className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 md:size-8">
            <MinusGlyph className="size-4" aria-hidden="true" />
          </button>
          <output aria-live="polite" data-testid="quantity" className="w-5 text-center md:text-xl">{quantity}</output>
          <button type="button" aria-label="Aumentar quantidade" disabled={quantity >= limit} onClick={() => setQuantity(quantity + 1)} className="flex size-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 md:size-8">
            <PlusGlyph className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className="ml-auto text-xl font-bold text-highlight md:hidden" data-testid="mobile-price">{formatEth(edition.price)}</p>
        {!soldOut && quantity >= limit && <p className="basis-full text-xs text-muted-foreground" role="status">Limite de {limit} {limit === 1 ? 'unidade' : 'unidades'} para esta edição.</p>}
        <div className="flex w-full gap-3 md:ml-auto md:w-auto md:gap-2">
          <Button size="lg" className="h-14 flex-1 rounded-full bg-cta max-md:max-w-[200px] md:h-10 md:w-[130px] md:flex-none md:rounded-sm md:bg-none md:bg-primary md:px-0 md:text-sm" disabled={soldOut || addToCart.isPending} onClick={() => submit(true)}>
            <span className="md:hidden">Comprar NFT</span>
            <span className="hidden md:inline">COMPRAR</span>
          </Button>
          <Button type="button" variant="ghost" size="icon-lg" aria-label="Adicionar ao carrinho" disabled={soldOut || addToCart.isPending} onClick={() => submit(false)} className="size-14 rounded-full border border-primary/40 bg-background text-primary md:hidden">
            <CartIcon className="size-6" />
          </Button>
          <FavoriteLabel nft={nft} />
        </div>
      </div>
      <p className="sr-only" data-testid="selected-edition">{edition.label}</p>
    </>
  )
}

function FavoriteLabel({ nft }: { nft: NftDetail }) {
  return <FavoriteButton nft={nft} showLabel className="hidden size-auto h-10 w-[130px] gap-2 rounded-sm border border-primary bg-transparent text-base text-foreground md:inline-flex" />
}

function Gallery({ nft }: { nft: NftDetail }) {
  return (
    <>
      <ul className="hidden gap-4 lg:grid lg:content-start" aria-label="Miniaturas">
        {[0, 1, 2, 3].map((i) => (
          <li key={i}>
            <NftImage artwork={nft.artwork} alt={`${nft.name}, miniatura ${i + 1}`} sizes="100px" size={160} className="rounded-md" />
          </li>
        ))}
      </ul>
      <div className="relative bg-card max-md:bg-transparent md:flex md:h-[448px] md:items-center md:justify-center md:p-5">
        <NftImage artwork={nft.artwork} alt={`Arte de ${nft.name}`} sizes="(min-width: 768px) 404px, 100vw" size={480} priority className="rounded-2xl max-md:aspect-[366/330] max-md:object-[50%_20%]" />
        <Dialog>
          <DialogTrigger asChild>
            <button type="button" aria-label="Ampliar imagem" className="absolute top-6 right-6 flex size-9 cursor-pointer items-center justify-center rounded-full bg-background/80 max-md:hidden">
              <SearchIcon className="size-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-xl">
            <DialogTitle>{nft.name}</DialogTitle>
            <DialogDescription className="sr-only">Imagem ampliada</DialogDescription>
            <NftImage artwork={nft.artwork} alt={`Arte ampliada de ${nft.name}`} sizes="560px" size={480} className="rounded-xl" />
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

export function DetailPage({ nftId }: { nftId: string }) {
  const { data: nft, isPending, isError, error, refetch } = useNft(nftId)

  if (isPending) return <DetailSkeleton />
  if (isError) {
    if (isApiError(error) && error.code === 'NOT_FOUND') {
      return <NotFound title="NFT não encontrado" message="Este NFT não existe ou foi removido do catálogo." />
    }
    return (
      <div role="alert" className="mx-auto flex max-w-page flex-col items-center gap-3 px-5 py-24 text-center">
        <p className="font-bold">Não foi possível carregar este NFT.</p>
        <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
        <Button onClick={() => void refetch()}>Tentar novamente</Button>
      </div>
    )
  }

  return <DetailContent key={nft.id} nft={nft} />
}

function DetailContent({ nft }: { nft: NftDetail }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Absolute in the browser; relative when prerendered at build time (no window there).
  const shareUrl = typeof window === 'undefined' ? pathname : `${window.location.origin}${pathname}`
  const [editionId, setEditionId] = useState(() => defaultEdition(nft.editions).id)
  const edition = nft.editions.find((candidate) => candidate.id === editionId) ?? defaultEdition(nft.editions)

  return (
    <>
      <MobileTopBar action={<FavoriteButton nft={nft} className="size-10 rounded-full bg-card" />} />
      <article className="mx-auto max-w-page px-5 pb-16">
        <Breadcrumbs items={[{ label: 'Início', to: '/' }, { label: 'Mercado' }]} />
        <div className="grid gap-6 pt-3 md:grid-cols-2 md:gap-x-7 lg:grid-cols-[100px_444px_1fr] lg:gap-x-[33px]">
          <Gallery nft={nft} />
          <div className="relative rounded-t-3xl bg-card p-5 max-md:-mx-5 max-md:-mt-12 max-md:flex max-md:flex-col max-md:pb-0 md:bg-transparent md:p-0">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-xl font-bold md:text-title md:leading-[37px]">{nft.name}</h1>
              <p className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-sm font-bold md:hidden">
                <StarIcon className="size-3.5 text-primary" /> {nft.rating.toFixed(1)}<span className="font-normal">({nft.reviewCount})</span>
              </p>
            </div>
            <div className="mt-3 hidden items-center justify-between border-b border-border pb-[25px] md:flex">
              <p className="text-xl leading-4 font-bold text-highlight" data-testid="detail-price">{formatEth(edition.price)}</p>
              <p className="flex items-center gap-1 text-base"><Stars rating={nft.rating} />{nft.reviewCount} avaliações de colecionadores</p>
            </div>
            <h2 className="mt-5 hidden text-base leading-4 font-bold md:block">Sobre este NFT:</h2>
            <p className="mt-3 text-sm leading-[22px] text-text-secondary">{nft.description}</p>
            <Purchase nft={nft} edition={edition} onEditionChange={setEditionId} />
            <dl className="mt-[13px] space-y-3 text-md leading-5 text-text-secondary">
              <div><dt className="inline">ID do token: </dt><dd className="inline">#{nft.tokenId}</dd></div>
              <div><dt className="inline">Coleção: </dt><dd className="inline">{nft.collectionName}</dd></div>
              <div><dt className="inline">Atributos: </dt><dd className="inline">{nft.attributes.join(', ')}</dd></div>
            </dl>
            <p className="mt-3 hidden items-center gap-2 text-base leading-4 font-bold md:flex">
              Compartilhar este NFT:
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no LinkedIn (abre em nova aba)" className="flex size-6 items-center justify-center hover:text-highlight"><LinkedinIcon className="size-[15px]" /></a>
              <a href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Compartilhar por e-mail" className="flex size-6 items-center justify-center hover:text-highlight"><MessageIcon className="size-[18px]" /></a>
              <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartilhar no X (abre em nova aba)" className="flex size-6 items-center justify-center hover:text-highlight"><XBrandIcon className="size-[14px]" /></a>
            </p>
          </div>
        </div>

        <Tabs defaultValue="details" className="mt-24 hidden md:block">
          <TabsList className="h-7 w-full justify-start gap-8 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger value="details" className="flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-3 text-base leading-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-highlight">Detalhes do NFT</TabsTrigger>
            <TabsTrigger value="reviews" className="flex-none rounded-none border-0 border-b-2 border-transparent px-0 pb-3 text-base leading-4 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-bold data-[state=active]:text-highlight">Avaliações de colecionadores ({nft.reviewCount})</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="space-y-3 pt-3 text-sm leading-6 text-text-secondary">
            {nft.story.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <p><strong className="block text-foreground">Rede:</strong>Cunhado na Ethereum com procedência imutável e metadados armazenados no IPFS.</p>
            <p><strong className="block text-foreground">Contrato:</strong>Direitos autorais do criador: {nft.royaltiesPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.</p>
            <p><strong className="block text-foreground">Direitos autorais:</strong>{nft.contractAddress} · Contrato inteligente ERC-721 verificado.</p>
          </TabsContent>
          <TabsContent value="reviews" className="pt-4 text-sm text-muted-foreground">As avaliações detalhadas não estão disponíveis nesta demonstração.</TabsContent>
        </Tabs>

        <section aria-labelledby="related-title" className="mt-24 max-md:hidden">
          <h2 id="related-title" className="h-7 border-b border-border text-base leading-4 font-bold text-highlight">Mais desta coleção</h2>
          <ul className="mt-8 grid grid-cols-3 gap-[26px] lg:grid-cols-5">
            {nft.related.map((item) => (
              <li key={item.id}><NftCard nft={item} sizes="220px" /></li>
            ))}
          </ul>
        </section>
        <p className="mt-8 text-center text-sm md:hidden"><Link to="/" className="text-highlight underline">Ver mais NFTs</Link></p>
      </article>
    </>
  )
}

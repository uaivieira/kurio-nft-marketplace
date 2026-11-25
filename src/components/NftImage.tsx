import type { Artwork } from '@/contracts/nft'
import { cn } from '@/lib/utils'

const WIDTHS = [160, 320, 480] as const

interface NftImageProps {
  artwork: Artwork
  alt: string
  /** Rendered CSS width hint used by the browser to pick a source. */
  sizes: string
  /** Intrinsic square size reserved to avoid layout shift. */
  size?: 160 | 320 | 480
  priority?: boolean
  className?: string
}

export function NftImage({ artwork, alt, sizes, size = 320, priority = false, className }: NftImageProps) {
  const set = (ext: 'avif' | 'webp') => WIDTHS.map((width) => `/nft/${artwork}-${width}.${ext} ${width}w`).join(', ')
  return (
    <picture>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        src={`/nft/${artwork}-${size}.webp`}
        alt={alt}
        width={size}
        height={size}
        sizes={sizes}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={cn('aspect-square h-auto w-full object-cover', className)}
      />
    </picture>
  )
}

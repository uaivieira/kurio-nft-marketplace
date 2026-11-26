import { MinusGlyph, PlusGlyph } from '@/components/icons/glyphs'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  max: number
  onChange: (value: number) => void
  /** Accessible name of the group; the buttons append it as "Diminuir quantidade de …". */
  label?: string
  disabled?: boolean
  /** `lg` is the 33×49.5 pill of the desktop detail frame, `sm` the 18×26 pill of the cart and mobile frames, `adaptive` switches from sm to lg at 768px. */
  size?: 'sm' | 'lg' | 'adaptive'
  /** Announces the new value (used where the quantity is the only feedback of the change). */
  live?: boolean
  testId?: string
  className?: string
  buttonClassName?: string
}

const button = {
  // The `sm` pill is 18px wide; the ::before layer widens the hit area to 26×26 (WCAG 2.5.8, 24px minimum).
  sm: "h-[26px] w-[18px] before:absolute before:-inset-x-1 before:inset-y-0 before:content-['']",
  lg: 'h-12 w-8',
  adaptive: "h-[26px] w-[18px] before:absolute before:-inset-x-1 before:inset-y-0 before:content-[''] md:h-12 md:w-8 md:before:hidden",
} as const
const glyph = { sm: 'size-3.5', lg: 'size-5', adaptive: 'size-3.5 md:size-5' } as const
const gap = { sm: 'gap-2.5', lg: 'gap-3', adaptive: 'gap-2.5 md:gap-3' } as const
const output = { sm: 'w-4 text-sm md:text-base', lg: 'w-[13px] text-xl', adaptive: 'w-4 md:w-[13px] md:text-xl' } as const

/** Quantity control shared by the NFT detail and the cart: pill buttons around the value, as in the Figma frames. */
export function QuantityStepper({ value, max, onChange, label, disabled = false, size = 'sm', live = false, testId, className, buttonClassName }: QuantityStepperProps) {
  const suffix = label ? ` de ${label}` : ''
  const buttonClass = cn('relative flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40', button[size], buttonClassName)
  return (
    <div role="group" aria-label={label ? `Quantidade${suffix}` : 'Quantidade'} className={cn('flex items-center', gap[size], className)}>
      <button type="button" aria-label={`Diminuir quantidade${suffix}`} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className={buttonClass}>
        <MinusGlyph className={glyph[size]} aria-hidden="true" />
      </button>
      <output aria-live={live ? 'polite' : undefined} data-testid={testId} className={cn('text-center', output[size])}>
        {value}
      </output>
      <button type="button" aria-label={`Aumentar quantidade${suffix}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={buttonClass}>
        <PlusGlyph className={glyph[size]} aria-hidden="true" />
      </button>
    </div>
  )
}

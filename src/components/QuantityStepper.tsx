import { MinusGlyph, PlusGlyph } from '@/components/icons/glyphs'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  value: number
  max: number
  onChange: (value: number) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'lg' | 'adaptive'
  live?: boolean
  testId?: string
  className?: string
  buttonClassName?: string
}

const button = {
  sm: "h-[26px] w-[18px] before:absolute before:-inset-x-1 before:inset-y-0 before:content-['']",
  lg: 'h-12 w-8',
  adaptive: "h-[26px] w-[18px] before:absolute before:-inset-x-1 before:inset-y-0 before:content-[''] md:h-12 md:w-8 md:before:hidden",
} as const
const glyph = { sm: 'size-3.5', lg: 'size-5', adaptive: 'size-3.5 md:size-5' } as const
const gap = { sm: 'gap-2.5', lg: 'gap-3', adaptive: 'gap-2.5 md:gap-3' } as const
const output = { sm: 'w-4 text-sm md:text-base', lg: 'w-[13px] text-xl', adaptive: 'w-4 md:w-[13px] md:text-xl' } as const

export function QuantityStepper({ value, max, onChange, label, disabled = false, size = 'sm', live = false, testId, className, buttonClassName }: QuantityStepperProps) {
  const { t } = useTranslation()
  const buttonClass = cn('relative flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-40', button[size], buttonClassName)
  return (
    <div role="group" aria-label={label ? t('common.quantity.groupOf', { label }) : t('common.quantity.group')} className={cn('flex items-center', gap[size], className)}>
      <button type="button" aria-label={label ? t('common.quantity.decreaseOf', { label }) : t('common.quantity.decrease')} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} className={buttonClass}>
        <MinusGlyph className={glyph[size]} aria-hidden="true" />
      </button>
      <output aria-live={live ? 'polite' : undefined} data-testid={testId} className={cn('text-center', output[size])}>
        {value}
      </output>
      <button type="button" aria-label={label ? t('common.quantity.increaseOf', { label }) : t('common.quantity.increase')} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={buttonClass}>
        <PlusGlyph className={glyph[size]} aria-hidden="true" />
      </button>
    </div>
  )
}

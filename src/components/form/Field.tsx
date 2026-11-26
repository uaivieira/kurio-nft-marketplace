import { HideIcon, ShowIcon } from '@/components/icons'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { translateMessage } from '@/i18n'
import { cn } from '@/lib/utils'

interface ControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

interface FieldProps {
  label: ReactNode
  hideLabel?: boolean
  error?: string
  hint?: string
  hintClassName?: string
  required?: boolean
  className?: string
  children: (props: ControlProps) => ReactNode
}

export function Field({ label, hideLabel, error, hint, hintClassName, required, className, children }: FieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-md leading-4', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden="true" className="relative top-[2.7px] ml-px text-[22px] leading-[0] text-coral">*</span>}
        {required && <span className="sr-only">{` ${t('common.required')}`}</span>}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && <p id={hintId} className={cn('text-xs text-muted-foreground', hintClassName)}>{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{translateMessage(error)}</p>}
    </div>
  )
}

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', props.className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <ShowIcon className="size-4" aria-hidden="true" /> : <HideIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}

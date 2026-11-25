import { HideIcon, ShowIcon } from '@/components/icons'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ControlProps {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
  'aria-required': boolean | undefined
}

interface FieldProps {
  label: ReactNode
  /** Keeps the label for assistive tech only, where the design shows just the placeholder. */
  hideLabel?: boolean
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: (props: ControlProps) => ReactNode
}

/** Label + control + error wired together: the error is announced and tied to the input. */
export function Field({ label, hideLabel, error, hint, required, className, children }: FieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-base leading-4', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden="true" className="ml-0.5 text-highlight">*</span>}
        {required && <span className="sr-only"> (obrigatório)</span>}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy, 'aria-required': required || undefined })}
      {hint && !error && <p id={hintId} className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={errorId} role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', props.className)} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {visible ? <ShowIcon className="size-4" aria-hidden="true" /> : <HideIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  )
}

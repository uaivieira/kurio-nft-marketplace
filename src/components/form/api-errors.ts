import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { isApiError } from '@/lib/api-error'

/**
 * Copies API field errors onto the form. Returns the message for anything that
 * could not be attached to a field, so the caller can show it as a form-level alert.
 */
export function applyApiErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): string | null {
  if (!isApiError(error)) return 'Algo deu errado. Tente novamente.'
  let attached = 0
  for (const [name, message] of Object.entries(error.fieldErrors)) {
    if (name in form.getValues()) {
      form.setError(name as Path<T>, { type: 'server', message })
      attached += 1
    }
  }
  if (attached > 0) {
    const first = Object.keys(error.fieldErrors).find((name) => name in form.getValues())
    if (first) form.setFocus(first as Path<T>)
    return null
  }
  return error.message
}

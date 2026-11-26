import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'
import { errorMessage, isApiError } from '@/lib/api-error'

export function applyApiErrors<T extends FieldValues>(form: UseFormReturn<T>, error: unknown): string | null {
  if (!isApiError(error)) return errorMessage(error)
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
  return errorMessage(error)
}

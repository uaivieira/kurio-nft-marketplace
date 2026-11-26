type Field = HTMLInputElement | HTMLTextAreaElement

interface Snapshot {
  values: Array<[string, string]>
  focused: string | null
}

let snapshot: Snapshot | null = null

const FIELD_SELECTOR = 'input[name]:not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea[name]'

export function capturePrerenderedInputs(root: HTMLElement) {
  const fields = [...root.querySelectorAll<Field>(FIELD_SELECTOR)]
  const values = fields.filter((field) => field.value !== field.defaultValue).map((field): [string, string] => [field.name, field.value])
  const active = document.activeElement
  const focused = active && root.contains(active) && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) ? active.name || null : null
  snapshot = values.length || focused ? { values, focused } : null
}

export function restorePrerenderedInputs(root: HTMLElement) {
  if (!snapshot) return
  const { values, focused } = snapshot
  snapshot = null
  const find = (name: string) => root.querySelector<Field>(`[name="${CSS.escape(name)}"]`)
  for (const [name, value] of values) {
    const field = find(name)
    if (!field || field.value) continue
    const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  }
  if (focused) find(focused)?.focus()
}

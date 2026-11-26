import { createElement, Fragment, type ReactNode } from 'react'

const MARK = '\u{F8FF}'

export function interpolate<TName extends string>(translate: (slots: Record<TName, string>) => string, values: Record<TName, ReactNode>): ReactNode {
  const names = Object.keys(values) as TName[]
  const slots = Object.fromEntries(names.map((name) => [name, `${MARK}${name}${MARK}`])) as Record<TName, string>
  const parts = translate(slots)
    .split(MARK)
    .map((part, index) => (index % 2 === 1 ? values[part as TName] : part))
    .filter((part) => part !== '')
  return createElement(Fragment, null, ...parts)
}

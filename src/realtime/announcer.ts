import { useSyncExternalStore } from 'react'

let message = ''
const listeners = new Set<() => void>()

export function announce(text: string) {
  message = message === text ? `${text} ` : text
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useAnnouncement = () => useSyncExternalStore(subscribe, () => message, () => message)

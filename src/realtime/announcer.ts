import { useSyncExternalStore } from 'react'

/** Feeds the global aria-live region so non-visual users hear mutations and live updates. */
let message = ''
const listeners = new Set<() => void>()

export function announce(text: string) {
  // Re-announcing the same text still needs a DOM change, so toggle a trailing marker.
  message = message === text ? `${text} ` : text
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useAnnouncement = () => useSyncExternalStore(subscribe, () => message, () => message)

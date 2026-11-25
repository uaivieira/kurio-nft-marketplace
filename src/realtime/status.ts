import { useSyncExternalStore } from 'react'

export type RealtimeStatus = 'connecting' | 'online' | 'offline'

let status: RealtimeStatus = 'connecting'
const listeners = new Set<() => void>()

export function setRealtimeStatus(next: RealtimeStatus) {
  if (next === status) return
  status = next
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useRealtimeStatus = () => useSyncExternalStore(subscribe, () => status, () => status)

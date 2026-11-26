import { useState } from 'react'

export function useReveal(pending: boolean, classes = 'animate-in fade-in duration-300 ease-out') {
  const [wasPending, setWasPending] = useState(pending)
  if (pending && !wasPending) setWasPending(true)
  return !pending && wasPending ? classes : ''
}

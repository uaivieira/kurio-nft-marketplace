import { useState } from 'react'

/**
 * Returns the enter-animation classes for content that replaces a skeleton. Content that is already
 * there on the first render (prerendered or cached) gets none, so it never flickers in.
 */
export function useReveal(pending: boolean, classes = 'animate-in fade-in duration-300 ease-out') {
  const [wasPending, setWasPending] = useState(pending)
  if (pending && !wasPending) setWasPending(true)
  return !pending && wasPending ? classes : ''
}

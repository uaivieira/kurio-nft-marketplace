import { useLayoutEffect } from 'react'

/** Shows #root again when the served HTML was prerendered for another URL (it is hidden until the app commits). */
export function RevealPrerender() {
  useLayoutEffect(() => {
    document.documentElement.removeAttribute('data-prerender-stale')
  }, [])
  return null
}

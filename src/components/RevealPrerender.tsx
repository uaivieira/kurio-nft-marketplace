import { useLayoutEffect } from 'react'

/**
 * Runs on the app's first commit: shows #root again when the served HTML was prerendered for another
 * URL (hidden until now) and flags the document as interactive (`data-app-ready`).
 */
export function RevealPrerender() {
  useLayoutEffect(() => {
    document.documentElement.removeAttribute('data-prerender-stale')
    document.documentElement.setAttribute('data-app-ready', '')
  }, [])
  return null
}

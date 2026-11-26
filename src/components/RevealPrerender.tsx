import { useLayoutEffect } from 'react'

export function RevealPrerender() {
  useLayoutEffect(() => {
    document.documentElement.removeAttribute('data-prerender-stale')
    document.documentElement.setAttribute('data-app-ready', '')
  }, [])
  return null
}

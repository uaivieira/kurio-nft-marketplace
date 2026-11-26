import { useEffect, useLayoutEffect } from 'react'
import { restorePrerenderedInputs } from '@/lib/prerender-inputs'

export function RevealPrerender() {
  useLayoutEffect(() => {
    document.documentElement.removeAttribute('data-prerender-stale')
    document.documentElement.setAttribute('data-app-ready', '')
  }, [])
  useEffect(() => {
    const root = document.getElementById('root')
    if (root) restorePrerenderedInputs(root)
  }, [])
  return null
}

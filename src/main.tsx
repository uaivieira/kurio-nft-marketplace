import { hydrate, QueryClientProvider, type DehydratedState } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { notify } from '@/lib/notify'
import { setAuthFailureHandler } from '@/lib/http'
import { expireSession } from '@/lib/auth-flow'
import { markBackendReady, markRealtimeReady } from '@/lib/backend-ready'
import { queryClient } from '@/lib/query-client'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { RevealPrerender } from '@/components/RevealPrerender'
import { router } from './router'
import './index.css'

declare global {
  interface Window {
    /** Query cache captured when the page was prerendered at build time (see scripts/prerender.ts). */
    __KURIO_STATE__?: DehydratedState
  }
}

/**
 * Seeds the cache with the prerendered data when the HTML matches this URL. The data is marked
 * stale so it is revalidated against this browser's backend right after mounting, without
 * falling back to skeletons.
 */
function adoptPrerenderedState() {
  const state = window.__KURIO_STATE__
  if (!state || document.documentElement.hasAttribute('data-prerender-stale')) return false
  hydrate(queryClient, {
    ...state,
    queries: state.queries.map((query) => ({ ...query, state: { ...query.state, dataUpdatedAt: 0 } })),
  })
  return true
}

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    void import('./mocks/browser').then(({ startMocks }) => startMocks()).then(markBackendReady)
  } else {
    markBackendReady()
    markRealtimeReady()
  }

  setAuthFailureHandler(() => {
    expireSession()
    notify.error('Sua sessão expirou. Entre novamente para continuar.')
    const { href } = router.state.location
    void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
  })

  // Over prerendered HTML, resolve the route (lazy component and data) before the first commit, so
  // React replaces the static markup with identical markup: no blank frame, no layout shift.
  if (adoptPrerenderedState()) await router.load()

  const root = createRoot(document.getElementById('root')!)
  startTransition(() => {
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RealtimeProvider>
            <RevealPrerender />
            <RouterProvider router={router} />
          </RealtimeProvider>
        </QueryClientProvider>
      </StrictMode>,
    )
  })
}

void bootstrap()

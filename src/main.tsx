import { hydrate, QueryClientProvider, type DehydratedState } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import i18n from '@/i18n'
import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { notify } from '@/lib/notify'
import { setAuthFailureHandler } from '@/lib/http'
import { expireSession } from '@/lib/auth-flow'
import { markBackendReady, markRealtimeReady } from '@/lib/backend-ready'
import { queryClient } from '@/lib/query-client'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { RevealPrerender } from '@/components/RevealPrerender'
import { afterLoad } from '@/lib/after-load'
import { capturePrerenderedInputs } from '@/lib/prerender-inputs'
import { router } from './router'
import './index.css'

function adoptPrerenderedState() {
  const json = document.getElementById('kurio-state')?.textContent
  if (import.meta.env.VITE_ENABLE_MOCKS === 'false') document.documentElement.setAttribute('data-prerender-stale', '')
  if (!json || document.documentElement.hasAttribute('data-prerender-stale')) return false
  const state = JSON.parse(json) as DehydratedState
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
    notify.error(i18n.t('auth.sessionExpired'))
    const { href } = router.state.location
    void router.navigate({ to: '/login', search: { redirect: href, reason: 'expired' } })
  })

  if ('modelContext' in navigator) {
    void afterLoad.then(() => import('@/agent/webmcp')).then(({ registerWebMcpTools }) => registerWebMcpTools(queryClient, (href) => router.navigate({ href })))
  }

  if (adoptPrerenderedState()) await router.load()

  const container = document.getElementById('root')!
  capturePrerenderedInputs(container)
  const root = createRoot(container)
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

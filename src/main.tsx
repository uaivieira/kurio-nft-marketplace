import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { notify } from '@/lib/notify'
import { setAuthFailureHandler } from '@/lib/http'
import { expireSession } from '@/lib/auth-flow'
import { markBackendReady, markRealtimeReady } from '@/lib/backend-ready'
import { queryClient } from '@/lib/query-client'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'
import { router } from './router'
import './index.css'

function bootstrap() {
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

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RealtimeProvider>
          <RouterProvider router={router} />
        </RealtimeProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap()

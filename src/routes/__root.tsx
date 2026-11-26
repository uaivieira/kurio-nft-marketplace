import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { LiveRegion } from '@/components/layout/LiveRegion'
import { lazy, Suspense, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { afterLoad } from '@/lib/after-load'

const Toaster = lazy(() => import('@/components/ui/sonner').then((m) => ({ default: m.Toaster })))
const MockPanel = lazy(() => import('@/mocks/MockPanel').then((m) => ({ default: m.MockPanel })))

const WITHOUT_FOOTER = ['/mercado', '/login', '/signup']

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const { t } = useTranslation()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    void afterLoad.then(() => setIdle(true))
  }, [])

  return (
    <>
      <a href="#main" className="sr-only z-[100] bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        {t('layout.skipToContent')}
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      {!WITHOUT_FOOTER.includes(pathname) && <Footer />}
      <p className="py-4 text-center text-xs md:hidden">
        <Trans i18nKey="layout.copyrightShort" components={{ anchor: <Link to="/" className="underline" /> }} />
      </p>
      <LiveRegion />
      {idle && (
        <Suspense fallback={null}>
          <Toaster position="top-center" />
          {import.meta.env.VITE_ENABLE_MOCKS !== 'false' && <MockPanel />}
        </Suspense>
      )}
    </>
  )
}

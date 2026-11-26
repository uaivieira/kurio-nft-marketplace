import { createRootRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { Footer } from '@/components/layout/Footer'
import { Header } from '@/components/layout/Header'
import { LiveRegion } from '@/components/layout/LiveRegion'
import { lazy, Suspense, useEffect, useState } from 'react'
import { afterLoad } from '@/lib/after-load'

// Not needed for the first paint: loaded after the page renders.
const Toaster = lazy(() => import('@/components/ui/sonner').then((m) => ({ default: m.Toaster })))
const MockPanel = lazy(() => import('@/mocks/MockPanel').then((m) => ({ default: m.MockPanel })))

/**
 * Pages drawn without the footer: the marketplace composition behind the Figma login/signup frames
 * ends below the catalog grid.
 */
const WITHOUT_FOOTER = ['/mercado', '/login', '/signup']

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    void afterLoad.then(() => setIdle(true))
  }, [])

  return (
    <>
      <a href="#main" className="sr-only z-[100] bg-primary px-4 py-2 font-bold text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      {!WITHOUT_FOOTER.includes(pathname) && <Footer />}
      <p className="py-4 text-center text-xs md:hidden">
        © 2026 Kurio. <Link to="/" className="underline">Início</Link>
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

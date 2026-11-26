import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { NotFound } from '@/components/layout/NotFound'
import { RouteError } from '@/components/layout/RouteError'

/** One router definition for the browser and for build-time prerendering (memory history). */
export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: 'intent',
    // Crossfade between pages where the browser supports View Transitions (no-op elsewhere). Search
    // param changes on the same page (filters, sort, pagination) update in place, without a crossfade.
    defaultViewTransition: { types: ({ pathChanged }) => (pathChanged ? ['page'] : false) },
    scrollRestoration: true,
    defaultNotFoundComponent: () => <NotFound />,
    defaultErrorComponent: RouteError,
  })
}

export const router = createAppRouter()

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

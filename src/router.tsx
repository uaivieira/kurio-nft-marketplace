import { createRouter, type RouterHistory } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { NotFound } from '@/components/layout/NotFound'
import { RouteError } from '@/components/layout/RouteError'

export function createAppRouter(history?: RouterHistory) {
  return createRouter({
    routeTree,
    history,
    defaultPreload: 'intent',
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

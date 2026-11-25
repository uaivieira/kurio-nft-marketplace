import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/redirect'

/** Layout route guarding every private screen: no session, no access (redirects with a return path). */
export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => requireAuth(location),
  component: Outlet,
})

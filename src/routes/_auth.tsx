import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '@/lib/redirect'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => requireAuth(location),
  component: Outlet,
})

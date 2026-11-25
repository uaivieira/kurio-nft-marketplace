import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { HomePage } from '@/features/catalog/HomePage'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { getSession } from '@/lib/session-store'
import { safeRedirect } from '@/lib/redirect'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    redirect: z.string().optional().catch(undefined),
    reason: z.literal('expired').optional().catch(undefined),
  }),
  beforeLoad: ({ search }) => {
    if (getSession()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: Login,
})

function Login() {
  const { redirect: target, reason } = Route.useSearch()
  return (
    <>
      <HomePage search={{}} />
      <AuthDialog mode="login" redirect={target} expired={reason === 'expired'} />
    </>
  )
}

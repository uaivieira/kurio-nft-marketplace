import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { HomePage } from '@/features/catalog/HomePage'
import { AuthDialog } from '@/features/auth/AuthDialog'
import { getSession } from '@/lib/session-store'
import { safeRedirect } from '@/lib/redirect'

export const Route = createFileRoute('/signup')({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => {
    if (getSession()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  component: Signup,
})

function Signup() {
  const { redirect: target } = Route.useSearch()
  return (
    <>
      <HomePage search={{}} />
      <AuthDialog mode="signup" redirect={target} />
    </>
  )
}

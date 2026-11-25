import { createFileRoute } from '@tanstack/react-router'
import { AccountLayout } from '@/features/account/AccountLayout'

export const Route = createFileRoute('/_auth/profile')({ component: AccountLayout })

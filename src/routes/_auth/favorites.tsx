import { createFileRoute } from '@tanstack/react-router'
import { FavoritesPage } from '@/features/account/FavoritesPage'

export const Route = createFileRoute('/_auth/favorites')({ component: FavoritesPage })

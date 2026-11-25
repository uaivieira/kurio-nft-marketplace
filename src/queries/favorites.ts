import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notify } from '@/lib/notify'
import { addFavorite, fetchFavorites, removeFavorite } from '@/api/catalog'
import type { FavoritesList } from '@/contracts/favorites'
import { errorMessage } from '@/lib/api-error'
import { scopeOf, useSession } from '@/lib/session-store'
import { announce } from '@/realtime/announcer'
import { keys } from './keys'

export function useFavorites() {
  const session = useSession()
  return useQuery({
    queryKey: keys.favorites(scopeOf(session)),
    queryFn: ({ signal }) => fetchFavorites(signal),
    enabled: Boolean(session),
  })
}

/** Optimistic toggle: the heart flips immediately and rolls back if the API rejects it. */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const scope = scopeOf(useSession())
  const key = keys.favorites(scope)

  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean; name: string }) =>
      favorite ? addFavorite(nftId) : removeFavorite(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<FavoritesList>(key)
      queryClient.setQueryData<FavoritesList>(key, (current) => {
        const ids = new Set(current?.nftIds ?? [])
        if (favorite) ids.add(nftId)
        else ids.delete(nftId)
        return { nftIds: [...ids] }
      })
      return { previous }
    },
    onSuccess: (_data, { favorite, name }) => {
      announce(favorite ? `${name} adicionado aos favoritos.` : `${name} removido dos favoritos.`)
    },
    onError: (error, { favorite, name }, context) => {
      queryClient.setQueryData(key, context?.previous)
      const message = `Não foi possível ${favorite ? 'favoritar' : 'remover dos favoritos'} ${name}. ${errorMessage(error, '')}`.trim()
      notify.error(message)
      announce(message)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })
}

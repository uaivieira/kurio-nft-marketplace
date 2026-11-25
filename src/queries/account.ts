import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/api/auth'
import * as ordersApi from '@/api/orders'
import { scopeOf, updateSessionUser, useSession } from '@/lib/session-store'
import { keys } from './keys'

export function useProfile() {
  const scope = scopeOf(useSession())
  return useQuery({ queryKey: keys.profile(scope), queryFn: ({ signal }) => authApi.fetchProfile(signal) })
}

export function useWallets() {
  const scope = scopeOf(useSession())
  return useQuery({ queryKey: keys.wallets(scope), queryFn: ({ signal }) => ordersApi.fetchWallets(signal) })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  const scope = scopeOf(useSession())
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: ({ profile, user }) => {
      queryClient.setQueryData(keys.profile(scope), profile)
      updateSessionUser(user)
    },
  })
}

export function useUpdateAvatar() {
  const queryClient = useQueryClient()
  const scope = scopeOf(useSession())
  return useMutation({
    mutationFn: authApi.updateAvatar,
    onSuccess: ({ profile, user }) => {
      queryClient.setQueryData(keys.profile(scope), profile)
      updateSessionUser(user)
    },
  })
}

export const useChangePassword = () => useMutation({ mutationFn: authApi.changePassword })

function useWalletsMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<Awaited<ReturnType<typeof ordersApi.fetchWallets>>>) {
  const queryClient = useQueryClient()
  const scope = scopeOf(useSession())
  return useMutation({ mutationFn, onSuccess: (wallets) => queryClient.setQueryData(keys.wallets(scope), wallets) })
}

export const useSavePrimaryWallet = () => useWalletsMutation(ordersApi.savePrimaryWallet)
export const useSaveSecondaryWallet = () => useWalletsMutation(ordersApi.saveSecondaryWallet)

import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { nftUpdatedEvent, orderUpdatedEvent, SOCKET_EVENTS, SOCKET_PATH, type NftUpdatedEvent, type OrderUpdatedEvent } from '@/contracts/events'
import type { CartLine } from '@/contracts/cart'
import type { CatalogPage, NftDetail } from '@/contracts/nft'
import type { Order } from '@/contracts/order'
import i18n from '@/i18n'
import { formatEth } from '@/lib/eth'
import { useSession } from '@/lib/session-store'
import { keys } from '@/queries/keys'
import { afterLoad } from '@/lib/after-load'
import { backendReady, realtimeReady } from '@/lib/backend-ready'
import { announce } from './announcer'
import { EventLedger } from './ledger'
import { setRealtimeStatus } from './status'

function applyNftUpdate(queryClient: QueryClient, ledger: EventLedger, event: NftUpdatedEvent, scope: string) {
  const { nftId, editions, price, totalAvailable } = event.data

  queryClient.setQueryData<NftDetail>(keys.nft(nftId), (cached) => {
    if (!cached || cached.version >= event.version) return cached
    return {
      ...cached,
      price,
      totalAvailable,
      version: event.version,
      editions: cached.editions.map((edition) => {
        const next = editions.find((candidate) => candidate.id === edition.id)
        return next ? { ...edition, price: next.price, available: next.available } : edition
      }),
    }
  })

  queryClient.setQueriesData<CatalogPage>({ queryKey: ['catalog'] }, (cached) => {
    if (!cached) return cached
    return {
      ...cached,
      items: cached.items.map((item) =>
        item.id === nftId && item.version < event.version ? { ...item, price, totalAvailable, version: event.version } : item,
      ),
    }
  })

  const cached = queryClient.getQueryData<{ lines: CartLine[] }>(keys.cart(scope))
  const line = cached?.lines.find((candidate) => candidate.nftId === nftId)
  if (line) {
    const next = editions.find((edition) => edition.id === line.editionId)
    if (next && next.price !== line.unitPrice) {
      announce(i18n.t('realtime.cartPriceChanged', { name: line.name, from: formatEth(line.unitPrice), to: formatEth(next.price) }))
    } else if (next && next.available < line.quantity) {
      announce(i18n.t('realtime.cartAvailabilityChanged', { name: line.name, available: next.available }))
    }
  }
  void queryClient.invalidateQueries({ queryKey: keys.cart(scope), refetchType: 'active' })
  void queryClient.invalidateQueries({ queryKey: ['private', scope, 'quote'], refetchType: 'active' })
  ledger.observe('nft', nftId, event.version)
}

function applyOrderUpdate(queryClient: QueryClient, event: OrderUpdatedEvent, scope: string) {
  const { orderId, status, failureReason, failure } = event.data
  queryClient.setQueryData<Order>(keys.order(scope, orderId), (cached) =>
    cached && cached.version < event.version ? { ...cached, status, failureReason, failure, version: event.version } : cached,
  )
  void queryClient.invalidateQueries({ queryKey: keys.order(scope, orderId) })
  void queryClient.invalidateQueries({ queryKey: keys.pendingOrders(scope) })
  if (status === 'confirmed') void queryClient.invalidateQueries({ queryKey: keys.cart(scope) })
  announce(status === 'confirmed' ? i18n.t('realtime.orderConfirmed') : status === 'rejected' ? i18n.t('realtime.orderRejected') : i18n.t('realtime.orderPending'))
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const session = useSession()
  const token = session?.token ?? null
  const userId = session?.user.id ?? null
  const scope = userId ?? 'guest'

  useEffect(() => {
    const ledger = new EventLedger()
    let socket: Socket | undefined
    let cancelled = false
    setRealtimeStatus('connecting')

    void Promise.all([backendReady, realtimeReady, afterLoad]).then(() => import('socket.io-client')).then(({ io }) => {
      if (cancelled) return
      const client = io(window.location.origin, {
        path: SOCKET_PATH,
        transports: ['websocket'],
        forceNew: true,
        query: token ? { token } : {},
        reconnectionDelay: 500,
        reconnectionDelayMax: 3000,
      })
      socket = client
      let hasConnected = false

      client.on('connect', () => {
        setRealtimeStatus('online')
        if (hasConnected) {
          void queryClient.invalidateQueries({ queryKey: ['nft'], refetchType: 'active' })
          void queryClient.invalidateQueries({ queryKey: ['catalog'], refetchType: 'active' })
          void queryClient.invalidateQueries({ queryKey: ['private', scope], refetchType: 'active' })
          announce(i18n.t('realtime.reconnected'))
        }
        hasConnected = true
      })
      client.on('disconnect', () => setRealtimeStatus('offline'))
      client.on('connect_error', () => setRealtimeStatus('offline'))

      client.on(SOCKET_EVENTS.nftUpdated, (payload: unknown) => {
        const parsed = nftUpdatedEvent.safeParse(payload)
        if (parsed.success && ledger.judge(parsed.data) === 'apply') applyNftUpdate(queryClient, ledger, parsed.data, scope)
      })
      client.on(SOCKET_EVENTS.orderUpdated, (payload: unknown) => {
        const parsed = orderUpdatedEvent.safeParse(payload)
        if (!parsed.success || parsed.data.userId !== userId) return
        if (ledger.judge(parsed.data) === 'apply') applyOrderUpdate(queryClient, parsed.data, scope)
      })
    })

    return () => {
      cancelled = true
      socket?.off()
      socket?.disconnect()
      ledger.clear()
    }
  }, [queryClient, token, userId, scope])

  return children
}

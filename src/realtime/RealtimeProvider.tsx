import { useQueryClient, type Query, type QueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import type { Socket } from 'socket.io-client'
import { nftUpdatedEvent, orderUpdatedEvent, SOCKET_EVENTS, SOCKET_PATH, type NftUpdatedEvent, type OrderUpdatedEvent } from '@/contracts/events'
import type { CartLine } from '@/contracts/cart'
import type { CatalogPage, NftDetail } from '@/contracts/nft'
import type { Order } from '@/contracts/order'
import i18n from '@/i18n'
import { compareEth, formatEth } from '@/lib/eth'
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

  const cart = queryClient.getQueryData<{ lines: CartLine[] }>(keys.cart(scope))
  for (const line of cart?.lines.filter((candidate) => candidate.nftId === nftId) ?? []) {
    const next = editions.find((edition) => edition.id === line.editionId)
    if (next && compareEth(next.price, line.unitPrice) !== 0) {
      announce(i18n.t('realtime.cartPriceChanged', { name: line.name, from: formatEth(line.unitPrice), to: formatEth(next.price) }))
    } else if (next && next.available < line.quantity) {
      announce(i18n.t('realtime.cartAvailabilityChanged', { name: line.name, available: next.available }))
    }
  }
  void queryClient.invalidateQueries({ queryKey: keys.cart(scope), refetchType: 'active' })
  void queryClient.invalidateQueries({ queryKey: ['private', scope, 'quote'], refetchType: 'active' })
  ledger.observe('nft', nftId, event.version)
}

const TERMINAL_STATUSES: ReadonlySet<Order['status']> = new Set(['confirmed', 'rejected'])

function applyOrderUpdate(queryClient: QueryClient, event: OrderUpdatedEvent, scope: string) {
  const { orderId, status, failureReason, failure } = event.data
  const cached = queryClient.getQueryData<Order>(keys.order(scope, orderId))
  if (cached && (TERMINAL_STATUSES.has(cached.status) || cached.version >= event.version)) return
  if (cached && status !== 'confirmed') {
    queryClient.setQueryData<Order>(keys.order(scope, orderId), { ...cached, status, failureReason, failure, version: event.version })
  }
  void queryClient.invalidateQueries({ queryKey: keys.order(scope, orderId) })
  void queryClient.invalidateQueries({ queryKey: keys.pendingOrders(scope) })
  if (status === 'confirmed') void queryClient.invalidateQueries({ queryKey: keys.cart(scope) })
  if (cached?.status === status) return
  announce(status === 'confirmed' ? i18n.t('realtime.orderConfirmed') : status === 'rejected' ? i18n.t('realtime.orderRejected') : i18n.t('realtime.orderPending'))
}

function observeRestVersions(ledger: EventLedger, query: Query) {
  const [root, , kind] = query.queryKey
  const data = query.state.data
  if (!data) return
  if (root === 'nft') {
    const nft = data as NftDetail
    ledger.observe('nft', nft.id, nft.version)
  } else if (root === 'catalog') {
    for (const item of (data as CatalogPage).items) ledger.observe('nft', item.id, item.version)
  } else if (root === 'private' && kind === 'order') {
    const order = data as Order
    ledger.observe('order', order.id, order.version)
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const session = useSession()
  const token = session?.token ?? null
  const userId = session?.user.id ?? null
  const scope = userId ?? 'guest'

  useEffect(() => {
    const ledger = new EventLedger()
    const queryCache = queryClient.getQueryCache()
    for (const query of queryCache.getAll()) observeRestVersions(ledger, query)
    const stopObserving = queryCache.subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'success') observeRestVersions(ledger, event.query)
    })
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
      stopObserving()
      socket?.off()
      socket?.disconnect()
      ledger.clear()
    }
  }, [queryClient, token, userId, scope])

  return children
}

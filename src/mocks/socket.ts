import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { SOCKET_PATH, type RealtimeEvent } from '@/contracts/events'
import { db, eventLog, subscribe } from './db/state'

/**
 * Socket.IO server simulated at the network layer. msw's WebSocket interception
 * plus @mswjs/socket.io-binding encode/decode the Engine.IO + Socket.IO frames,
 * so the real socket.io-client in the app talks to it over `ws://<origin>/realtime/`.
 *
 * Limitations: websocket transport only (no HTTP long-polling), default namespace
 * only, no acknowledgements; the token travels as a query param because the binding
 * does not expose the CONNECT packet payload. The custom path (not the default
 * /socket.io/) avoids msw's special-casing of that prefix, which would otherwise
 * also capture Vite's HMR socket on `/` during development.
 */
const PING_INTERVAL_MS = 20_000

interface Client {
  userId: string | null
  emit: (type: string, payload: unknown) => void
  close: () => void
}

const clients = new Set<Client>()
let online = true

export const socketLink = () => ws.link(`${location.origin.replace(/^http/, 'ws')}${SOCKET_PATH}`)

export function createSocketHandlers() {
  const link = socketLink()
  return [
    link.addEventListener('connection', (connection) => {
      if (!online) {
        connection.client.close(1013, 'Servidor indisponível')
        return
      }
      const token = new URL(connection.client.url).searchParams.get('token')
      const session = token ? db.sessions[token] : undefined
      const io = toSocketIo(connection)
      const client: Client = {
        userId: session && session.expiresAt > Date.now() ? session.userId : null,
        emit: (type, payload) => io.client.emit(type, payload),
        close: () => connection.client.close(1006, 'Conexão encerrada'),
      }
      clients.add(client)

      const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)
      connection.client.addEventListener('close', () => {
        clearInterval(ping)
        clients.delete(client)
      })
    }),
  ]
}

/** nft.updated is public; order.updated only reaches the owner's connections. */
export function broadcast(event: RealtimeEvent) {
  for (const client of clients) {
    if (event.type === 'order.updated' && event.userId !== client.userId) continue
    client.emit(event.type, event)
  }
}

export function startSocketBridge() {
  return subscribe(broadcast)
}

export function lastEvent(type?: RealtimeEvent['type']) {
  return [...eventLog].reverse().find((event) => !type || event.type === type)
}

export function dropSockets() {
  for (const client of [...clients]) client.close()
}

export function setSocketOnline(value: boolean) {
  online = value
  if (!value) dropSockets()
}

export const connectedSocketCount = () => clients.size

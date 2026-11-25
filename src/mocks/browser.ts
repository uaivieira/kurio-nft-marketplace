import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { defineNetwork, InterceptorSource } from 'msw/experimental'
import { createControl } from './control'
import { initDb } from './db/state'
import { scheduleSettlement } from './domain/orders'
import { restHandlers } from './handlers'
import { isScenarioId, loadScenario, setScenario } from './scenarios'
import { afterLoad } from '@/lib/after-load'
import { markRealtimeReady } from '@/lib/backend-ready'

declare global {
  interface Window {
    __kurio?: ReturnType<typeof createControl>
  }
}

/**
 * Boots the simulated backend: persisted db, scenario, REST handlers, Socket.IO server.
 *
 * MSW intercepts in the page (XMLHttpRequest, fetch and WebSocket interceptors) instead of through a
 * service worker: the same handlers answer every request, without a worker to register and activate
 * before the first API call on a cold load.
 */
export async function startMocks() {
  await initDb()
  loadScenario()
  const requested = new URLSearchParams(location.search).get('scenario')
  if (isScenarioId(requested)) setScenario(requested)

  const network = defineNetwork({
    // A single source: every InterceptorSource registers under the same global symbol, so a second one
    // would silently reuse the first and never apply its own interceptors. (The cast bridges the
    // per-interceptor event-map generics, as msw's own setupWorker does for its WebSocket source.)
    sources: [new InterceptorSource({ interceptors: [new XMLHttpRequestInterceptor(), new FetchInterceptor(), new WebSocketInterceptor()] as unknown as ConstructorParameters<typeof InterceptorSource>[0]['interceptors'] })],
    handlers: restHandlers,
    onUnhandledFrame: 'bypass',
    context: { quiet: true },
  })
  await network.enable()

  scheduleSettlement()
  window.__kurio = createControl()

  // The Socket.IO server (binding + parsers) is not needed for the first paint: register it once the
  // page is idle. The client waits for `realtimeReady` before connecting.
  void afterLoad.then(async () => {
    const socket = await import('./socket')
    network.use(...socket.createSocketHandlers())
    socket.startSocketBridge()
    markRealtimeReady()
  })
}

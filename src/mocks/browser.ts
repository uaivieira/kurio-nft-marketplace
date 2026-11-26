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

export async function startMocks() {
  await initDb()
  loadScenario()
  const requested = new URLSearchParams(location.search).get('scenario')
  if (isScenarioId(requested)) setScenario(requested)

  const network = defineNetwork({
    sources: [new InterceptorSource({ interceptors: [new XMLHttpRequestInterceptor(), new FetchInterceptor(), new WebSocketInterceptor()] as unknown as ConstructorParameters<typeof InterceptorSource>[0]['interceptors'] })],
    handlers: restHandlers,
    onUnhandledFrame: 'bypass',
    context: { quiet: true },
  })
  await network.enable()

  scheduleSettlement()
  window.__kurio = createControl()

  void afterLoad.then(async () => {
    const socket = await import('./socket')
    network.use(...socket.createSocketHandlers())
    socket.startSocketBridge()
    markRealtimeReady()
  })
}

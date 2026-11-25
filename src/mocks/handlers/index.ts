import { http, HttpResponse } from 'msw'
import { resetDb } from '../db/state'
import { resetScenarioCounters, runtime, SCENARIOS } from '../scenarios'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'

/** Control endpoints bypass scenario latency/failures so tests can always reach them. */
const controlHandlers = [
  http.get('/api/__mock/scenarios', () => HttpResponse.json({ active: runtime.scenario, scenarios: SCENARIOS })),
  http.post('/api/__mock/reset', async () => {
    await resetDb()
    resetScenarioCounters()
    return HttpResponse.json({ ok: true })
  }),
]

export const restHandlers = [...controlHandlers, ...authHandlers, ...catalogHandlers, ...cartHandlers, ...accountHandlers]

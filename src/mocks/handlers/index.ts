import { http, HttpResponse } from 'msw'
import { resetBackend } from '../control'
import { runtime, SCENARIOS } from '../scenarios'
import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'

const controlHandlers = [
  http.get('/api/__mock/scenarios', () => HttpResponse.json({ active: runtime.scenario, scenarios: SCENARIOS })),
  http.post('/api/__mock/reset', async () => {
    await resetBackend()
    return HttpResponse.json({ ok: true })
  }),
]

export const restHandlers = [...controlHandlers, ...authHandlers, ...catalogHandlers, ...cartHandlers, ...accountHandlers]

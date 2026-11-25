import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { apiErrorBody } from '@/contracts/errors'
import { ApiError } from './api-error'
import { backendReady } from './backend-ready'
import { getGuestId, getToken } from './session-store'

const TIMEOUT_MS = Number(import.meta.env.VITE_HTTP_TIMEOUT_MS ?? 10_000)
const TIMEOUT_REASON = 'kurio:timeout'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /** Per-request deadline, owned by the interceptors below. */
    deadline?: { controller: AbortController; timer: ReturnType<typeof setTimeout> }
  }
}

export const http = axios.create({ baseURL: '/api', headers: { Accept: 'application/json' } })

type AuthFailureHandler = (error: ApiError) => void
let onAuthFailure: AuthFailureHandler | null = null

/** The auth module registers how an expired session is handled; the HTTP layer stays UI-agnostic. */
export function setAuthFailureHandler(handler: AuthFailureHandler | null) {
  onAuthFailure = handler
}

/**
 * The timeout is a timer-driven abort instead of XHR's native `timeout`, so it composes with the
 * caller's AbortSignal (query cancellation) and follows the page clock (deterministic in tests).
 */
function armDeadline(config: InternalAxiosRequestConfig) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(TIMEOUT_REASON), TIMEOUT_MS)
  const upstream = config.signal as AbortSignal | undefined
  config.signal = upstream ? AbortSignal.any([upstream, controller.signal]) : controller.signal
  config.deadline = { controller, timer }
}

const disarmDeadline = (config: InternalAxiosRequestConfig | undefined) => {
  if (config?.deadline) clearTimeout(config.deadline.timer)
}

http.interceptors.request.use(async (config) => {
  await backendReady
  const token = getToken()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  else config.headers.set('X-Guest-Id', getGuestId())
  armDeadline(config)
  return config
})

function normalise(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  if (axios.isCancel(error)) {
    const config = (error as AxiosError).config
    if (config?.deadline?.controller.signal.aborted) return new ApiError('TIMEOUT', 'O servidor demorou para responder.')
    // Cancelled by the caller (stale query): not a failure, let TanStack Query discard it.
    throw error
  }
  if (error instanceof AxiosError) {
    if (!error.response) return new ApiError('NETWORK', 'Sem conexão com o servidor.')
    const parsed = apiErrorBody.safeParse(error.response.data)
    if (parsed.success) return new ApiError(parsed.data.code, parsed.data.message, error.response.status, parsed.data)
    return new ApiError(error.response.status >= 500 ? 'TRANSIENT' : 'UNKNOWN', 'Resposta inesperada do servidor.', error.response.status)
  }
  return new ApiError('UNKNOWN', 'Erro inesperado.')
}

http.interceptors.response.use(
  (response) => {
    disarmDeadline(response.config)
    return response
  },
  (error: unknown) => {
    disarmDeadline((error as AxiosError).config)
    const apiError = normalise(error)
    if (apiError.code === 'SESSION_EXPIRED' && getToken()) onAuthFailure?.(apiError)
    return Promise.reject(apiError)
  },
)

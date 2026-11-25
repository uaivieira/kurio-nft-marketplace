import type { ApiErrorBody, ErrorCode } from '@/contracts/errors'

export type ClientErrorCode = ErrorCode | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN'

/** Every failure that leaves the HTTP layer is normalised to this one shape. */
export class ApiError extends Error {
  readonly code: ClientErrorCode
  readonly status: number | null
  readonly fieldErrors: Record<string, string>
  readonly details: unknown

  constructor(code: ClientErrorCode, message: string, status: number | null = null, body?: Partial<ApiErrorBody>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fieldErrors = body?.fieldErrors ?? {}
    this.details = body?.details
  }

  /** Safe to retry automatically: nothing was rejected on business grounds. */
  get retryable() {
    return this.code === 'TRANSIENT' || this.code === 'NETWORK'
  }

  get isAuthFailure() {
    return this.code === 'SESSION_EXPIRED' || this.code === 'UNAUTHENTICATED'
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.') {
  if (isApiError(error)) {
    if (error.code === 'NETWORK') return 'Sem conexão com o servidor. Verifique sua rede e tente novamente.'
    if (error.code === 'TIMEOUT') return 'O servidor demorou para responder. Tente novamente.'
    return error.message
  }
  return fallback
}

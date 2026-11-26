import { quoteIssue } from '@/contracts/cart'
import type { ApiErrorBody, ErrorCode } from '@/contracts/errors'
import i18n, { translateKey } from '@/i18n'
import { issueMessage } from './quote-issues'

export type ClientErrorCode = ErrorCode | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN'

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

  get retryable() {
    return this.code === 'TRANSIENT' || this.code === 'NETWORK'
  }

  get isAuthFailure() {
    return this.code === 'SESSION_EXPIRED' || this.code === 'UNAUTHENTICATED'
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

interface ErrorDetails {
  reason?: unknown
  limit?: unknown
  quote?: { issues?: unknown }
}

function blockingIssue(details: ErrorDetails) {
  const issues = Array.isArray(details.quote?.issues) ? details.quote.issues : []
  for (const candidate of issues) {
    const parsed = quoteIssue.safeParse(candidate)
    if (parsed.success && parsed.data.kind !== 'price-changed') return parsed.data
  }
  return null
}

export function errorMessage(error: unknown, fallback: string = i18n.t('errors.generic')) {
  if (!isApiError(error)) return fallback
  const details: ErrorDetails = typeof error.details === 'object' && error.details !== null ? (error.details as ErrorDetails) : {}
  if (error.code === 'AVAILABILITY_CONFLICT') {
    const issue = blockingIssue(details)
    if (issue) return issueMessage(issue)
  }
  const reasonKey = typeof details.reason === 'string' ? `errors.${error.code}.${details.reason}` : null
  const key = reasonKey && i18n.exists(reasonKey) ? reasonKey : `errors.${error.code}.default`
  return translateKey(key, { limit: details.limit })
}

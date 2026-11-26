import { z } from 'zod'

export const ERROR_CODES = [
  'VALIDATION',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'AVAILABILITY_CONFLICT',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUOTE_STALE',
  'IDEMPOTENCY_MISMATCH',
  'WALLET_REFUSED',
  'TRANSIENT',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export const apiErrorBody = z.object({
  code: z.enum(ERROR_CODES),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
  details: z.unknown().optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorBody>

export const ERROR_STATUS: Record<ErrorCode, number> = {
  VALIDATION: 422,
  UNAUTHENTICATED: 401,
  SESSION_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  AVAILABILITY_CONFLICT: 409,
  COUPON_INVALID: 422,
  COUPON_EXPIRED: 422,
  QUOTE_STALE: 409,
  IDEMPOTENCY_MISMATCH: 409,
  WALLET_REFUSED: 403,
  TRANSIENT: 503,
}

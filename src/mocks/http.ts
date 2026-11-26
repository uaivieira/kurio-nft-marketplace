import { delay, HttpResponse, type PathParams } from 'msw'
import type { ZodType } from 'zod'
import { ERROR_STATUS, type ApiErrorBody, type ErrorCode } from '@/contracts/errors'
import { baseLatency, once, runtime } from './scenarios'
import { db, persist, type UserRecord } from './db/state'

export class MockHttpError extends Error {
  readonly code: ErrorCode
  readonly fieldErrors?: Record<string, string>
  readonly details?: unknown

  constructor(code: ErrorCode, message: string, fieldErrors?: Record<string, string>, details?: unknown) {
    super(message)
    this.code = code
    this.fieldErrors = fieldErrors
    this.details = details
  }
}

export interface RouteContext<TParams extends PathParams> {
  request: Request
  params: TParams
  url: URL
  user: UserRecord | null
  token: string | null
  guestId: string | null
  body: <T>(schema: ZodType<T>) => Promise<T>
}

interface RouteOptions {
  auth?: boolean
  tag?: 'catalog' | 'favorites-write' | 'order-create' | 'wallet-connect'
}

type Handler<TParams extends PathParams> = (ctx: RouteContext<TParams>) => unknown | Promise<unknown>

function authenticate(request: Request): { user: UserRecord | null; token: string | null } {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return { user: null, token: null }
  const session = db.sessions[token]
  if (!session) return { user: null, token }
  if (session.expiresAt < Date.now()) {
    delete db.sessions[token]
    persist()
    return { user: null, token }
  }
  return { user: db.users[session.userId] ?? null, token }
}

async function applyScenario(options: RouteOptions): Promise<Response | undefined> {
  runtime.requestSeq += 1
  const { scenario } = runtime

  if (scenario === 'offline') {
    await delay(150)
    return HttpResponse.error()
  }
  await delay(baseLatency())

  if (options.tag === 'catalog') {
    runtime.catalogCalls += 1
    const failing = scenario === 'http-500' || (scenario === 'flaky-catalog' && runtime.catalogCalls <= 3)
    if (failing) return errorResponse(new MockHttpError('TRANSIENT', 'Service unavailable.'))
  }
  if (options.tag === 'favorites-write' && scenario === 'favorites-fail') {
    return errorResponse(new MockHttpError('TRANSIENT', 'Favorites update failed.', undefined, { reason: 'favorites' }))
  }
  if (options.tag === 'wallet-connect' && scenario === 'wallet-refused') {
    return errorResponse(new MockHttpError('WALLET_REFUSED', 'Wallet refused the connection.'))
  }
  return undefined
}

function errorResponse(error: MockHttpError) {
  const body: ApiErrorBody = { code: error.code, message: error.message, fieldErrors: error.fieldErrors, details: error.details }
  return HttpResponse.json(body, { status: ERROR_STATUS[error.code] })
}

export function route<TParams extends PathParams = PathParams>(
  options: RouteOptions,
  handler: Handler<TParams>,
  successStatus = 200,
) {
  return async ({ request, params: rawParams }: { request: Request; params: PathParams }) => {
    const params = rawParams as TParams
    const early = await applyScenario(options)
    if (early) return early

    try {
      const { user, token } = authenticate(request)
      if (options.auth) {
        if (!token) throw new MockHttpError('UNAUTHENTICATED', 'Authentication required.')
        if (runtime.scenario === 'session-expired' && once('session-expired')) {
          delete db.sessions[token]
          persist()
          throw new MockHttpError('SESSION_EXPIRED', 'Session expired.')
        }
        if (!user) throw new MockHttpError('SESSION_EXPIRED', 'Session expired.')
      }
      const ctx: RouteContext<TParams> = {
        request,
        params,
        url: new URL(request.url),
        user,
        token,
        guestId: request.headers.get('x-guest-id'),
        body: async (schema) => {
          const raw: unknown = await request.json().catch(() => ({}))
          const parsed = schema.safeParse(raw)
          if (parsed.success) return parsed.data
          const fieldErrors: Record<string, string> = {}
          for (const issue of parsed.error.issues) {
            const key = issue.path.join('.') || '_'
            fieldErrors[key] ??= issue.message
          }
          throw new MockHttpError('VALIDATION', 'Request body failed validation.', fieldErrors)
        },
      }
      const result = await handler(ctx)
      if (options.tag === 'order-create' && runtime.scenario === 'order-timeout' && once('order-timeout')) {
        await delay('infinite')
      }
      if (result instanceof Response) return result
      if (result === undefined) return new HttpResponse(null, { status: 204 })
      return HttpResponse.json(result as Record<string, unknown>, { status: successStatus })
    } catch (error) {
      if (error instanceof MockHttpError) return errorResponse(error)
      throw error
    }
  }
}

export function requireUser(ctx: { user: UserRecord | null }): UserRecord {
  if (!ctx.user) throw new MockHttpError('UNAUTHENTICATED', 'Authentication required.')
  return ctx.user
}

import type { ErrorRequestHandler } from 'express'
import { env } from '../config/env.js'
import { AuthError } from '../modules/auth/auth.errors.js'
import { sanitizeRegistrationDiagnosticMessage } from '../modules/auth/registration-diagnostics.js'
import { CorsOriginError } from './corsOriginError.js'

const AUTH_DIAGNOSTIC_LOGGED = Symbol.for('auth.diagnostic.logged')

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof AuthError) {
    if (error.statusCode >= 500 && error.cause && !(AUTH_DIAGNOSTIC_LOGGED in error)) {
      const rootCause = error.cause instanceof Error && error.cause.cause !== undefined
        ? error.cause.cause
        : error.cause
      const causeCode =
        rootCause && typeof rootCause === 'object' && 'code' in rootCause && typeof rootCause.code === 'string'
          ? rootCause.code
          : undefined
      const causeName = rootCause instanceof Error ? rootCause.name : typeof rootCause
      const rawMessage = rootCause instanceof Error ? rootCause.message : String(rootCause)
      const sanitizedMessage = sanitizeRegistrationDiagnosticMessage(
        rawMessage.replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-db-url]'),
        [env.databaseUrl, env.authJwtSecret]
      )
      console.error('[API] Auth service unavailable', {
        method: _request.method,
        path: _request.originalUrl,
        statusCode: error.statusCode,
        name: causeName,
        ...(causeCode ? { code: causeCode } : {}),
        message: sanitizedMessage,
      })
    }
    response.status(error.statusCode).json({
      message: error.message,
      ...(error.errorCode ? { code: error.errorCode } : {}),
    })
    return
  }

  if (error instanceof CorsOriginError) {
    response.status(403).json({ message: 'Request origin is not allowed' })
    return
  }

  const parseError = error && typeof error === 'object' &&
    'type' in error && error.type === 'entity.parse.failed'
  if (parseError) {
    response.status(400).json({ message: 'Invalid JSON request body' })
    return
  }

  const oversizedBody = error && typeof error === 'object' &&
    'type' in error && error.type === 'entity.too.large'
  if (oversizedBody) {
    response.status(413).json({ message: 'Request body is too large' })
    return
  }

  const errorName = error instanceof Error ? error.name : 'UnknownError'
  const errorMessage = error instanceof Error ? error.message : String(error)
  const causeMessage = error instanceof Error && error.cause instanceof Error
    ? error.cause.message
    : undefined
  console.error('[API] Request failed', {
    method: _request.method,
    path: _request.originalUrl,
    name: errorName,
    message: errorMessage,
    ...(causeMessage ? { cause: causeMessage } : {}),
  })
  response.status(500).json({ message: 'Internal server error' })
}

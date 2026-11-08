import type { ErrorRequestHandler } from 'express'
import { AuthError } from '../modules/auth/auth.errors.js'

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof AuthError) {
    response.status(error.statusCode).json({ message: error.message })
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

import type { RequestHandler } from 'express'
import { env } from '../../config/env.js'
import { AuthError } from './auth.errors.js'
import { authService } from './auth.service.js'

export const requireTrustedOrigin: RequestHandler = (request, _response, next) => {
  const origin = request.get('origin')
  let expectedOrigins: string[]

  try {
    expectedOrigins = [new URL(env.frontendUrl).origin, new URL(env.apiOrigin).origin]
  } catch {
    next(new Error('FRONTEND_URL and API_ORIGIN must be valid URLs'))
    return
  }

  if (!origin || !expectedOrigins.includes(origin)) {
    next(new AuthError('Request origin is not allowed', 403))
    return
  }

  next()
}

export const authenticate: RequestHandler = (request, response, next) => {
  const authorization = request.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)$/i.exec(authorization)
  authService
    .authenticateAccessToken(match?.[1])
    .then((user) => {
      response.locals.authUser = user
      next()
    })
    .catch(next)
}

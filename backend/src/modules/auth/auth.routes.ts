import { Router } from 'express'
import { env } from '../../config/env.js'
import { authenticate, requireTrustedOrigin } from './auth.middleware.js'
import { authController } from './auth.controller.js'
import { authRateLimit } from './auth.rate-limit.js'

export const authRouter = Router()

authRouter.post(
  '/register',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.register(request, response, next)
)
authRouter.post(
  '/login',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.login(request, response, next)
)
authRouter.post(
  '/refresh',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.refresh(request, response, next)
)
authRouter.post(
  '/logout',
  requireTrustedOrigin,
  (request, response, next) => authController.logout(request, response, next)
)
authRouter.post(
  '/forgot-password',
  requireTrustedOrigin,
  authRateLimit(env.authResetRateLimit),
  (request, response, next) => authController.forgotPassword(request, response, next)
)
authRouter.post(
  '/reset-password',
  requireTrustedOrigin,
  authRateLimit(env.authResetRateLimit),
  (request, response, next) => authController.resetPassword(request, response, next)
)
authRouter.get('/me', authenticate, (request, response, next) =>
  authController.me(request, response, next)
)

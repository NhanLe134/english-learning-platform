import { Router } from 'express'
import { env } from '../../config/env.js'
import { authenticate, requireTrustedOrigin } from './auth.middleware.js'
import { authController } from './auth.controller.js'
import { authRateLimit } from './auth.rate-limit.js'

export const authRouter = Router()

authRouter.get(
  '/google',
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.googleRedirect(request, response, next)
)
authRouter.get('/google/callback', (request, response, next) =>
  authController.googleCallback(request, response, next)
)
authRouter.post(
  '/register',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.register(request, response, next)
)
authRouter.post(
  '/register/verification/resend',
  requireTrustedOrigin,
  authRateLimit(env.authResetRateLimit),
  (request, response, next) => authController.resendRegistrationOtp(request, response, next)
)
authRouter.post(
  '/register/verification/verify',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.verifyRegistrationOtp(request, response, next)
)
authRouter.post(
  '/login',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.login(request, response, next)
)
authRouter.post(
  '/google',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.google(request, response, next)
)
authRouter.post(
  '/google/identity',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => authController.googleIdentity(request, response, next)
)
authRouter.post(
  '/refresh',
  requireTrustedOrigin,
  // KHÔNG rate limit: refresh chạy tự động mỗi lần tải trang, giới hạn sẽ chặn
  // cả người dùng duyệt web bình thường (rate limit chỉ dành cho login/OTP).
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
authRouter.get('/me', authenticate, (request, response, next) =>
  authController.me(request, response, next)
)

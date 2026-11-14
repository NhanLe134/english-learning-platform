import { Router } from 'express'
import { env } from '../../config/env.js'
import { authenticate, requireTrustedOrigin } from '../auth/auth.middleware.js'
import { authRateLimit } from '../auth/auth.rate-limit.js'
import { paymentController } from './payments.controller.js'

export const paymentsRouter = Router()

// Webhook is public (no auth) — SePay posts to it directly
paymentsRouter.post(
  '/sepay-webhook',
  (request, response, next) => paymentController.sepayWebhook(request, response, next),
)

// Direct VietQR transfer notifications use SePay Bank Webhooks. This is
// separate from the existing Merchant Gateway IPN route above.
paymentsRouter.post('/sepay-bank-webhook', (request, response) =>
  paymentController.sepayBankWebhook(request, response),
)

// Verified, pre-login registration users can pay without receiving an auth token.
paymentsRouter.post(
  '/orders/guest',
  requireTrustedOrigin,
  authRateLimit(env.authLoginRateLimit),
  (request, response, next) => paymentController.createGuestOrder(request, response, next),
)
paymentsRouter.get('/orders/:orderId/public', (request, response, next) =>
  paymentController.getPublicOrderStatus(request, response, next),
)

// Student order endpoints require authentication
paymentsRouter.use(authenticate)

paymentsRouter.post('/orders', (request, response, next) =>
  paymentController.createOrder(request, response, next),
)

paymentsRouter.get('/orders/:orderId', (request, response, next) =>
  paymentController.getOrder(request, response, next),
)

paymentsRouter.get('/orders/:orderId/events', (request, response, next) =>
  paymentController.streamOrderStatus(request, response, next),
)

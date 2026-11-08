import { Router } from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import { paymentController } from './payments.controller.js'

export const paymentsRouter = Router()

// Webhook is public (no auth) — SePay posts to it directly
paymentsRouter.post(
  '/sepay-webhook',
  (request, response, next) => paymentController.sepayWebhook(request, response, next),
)

// Student order endpoints require authentication
paymentsRouter.use(authenticate)

paymentsRouter.post('/orders', (request, response, next) =>
  paymentController.createOrder(request, response, next),
)

paymentsRouter.get('/orders/:orderId', (request, response, next) =>
  paymentController.getOrder(request, response, next),
)
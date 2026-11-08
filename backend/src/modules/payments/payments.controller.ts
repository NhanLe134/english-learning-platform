import type { Request, Response, NextFunction } from 'express'
import { paymentService } from './payments.service.js'
import type { SePayWebhookEvent } from './payments.types.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class PaymentController {
  async createOrder(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = response.locals.authUser as { id?: string } | undefined
      const studentId = String(user?.id ?? '')

      if (!UUID_PATTERN.test(studentId)) {
        response.status(401).json({ success: false, message: 'Authentication required.' })
        return
      }

      const { courseId, amount, transferContent, expiredAt } = request.body as {
        courseId?: unknown
        amount?: unknown
        transferContent?: unknown
        expiredAt?: unknown
      }

      if (!courseId || typeof courseId !== 'string' || !UUID_PATTERN.test(courseId)) {
        response.status(400).json({ success: false, message: 'Valid courseId is required.' })
        return
      }

      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
        response.status(400).json({ success: false, message: 'Valid amount is required.' })
        return
      }

      if (typeof transferContent !== 'string' || !transferContent.trim()) {
        response.status(400).json({ success: false, message: 'Transfer content is required.' })
        return
      }

      if (typeof expiredAt !== 'string' || !expiredAt) {
        response.status(400).json({ success: false, message: 'Expired at is required.' })
        return
      }

      const { order, vietQrUrl } = await paymentService.createOrder({
        studentId,
        courseId,
        amount,
        transferContent: transferContent.trim(),
        expiredAt,
      })

      response.status(201).json({
        success: true,
        data: {
          orderId: order.id,
          status: order.status,
          amount: order.amount,
          transferContent: order.transfer_content,
          expiredAt: order.expired_at,
          vietQrUrl,
          createdAt: order.created_at,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async getOrder(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const user = response.locals.authUser as { id?: string } | undefined
      const studentId = String(user?.id ?? '')

      const { orderId } = request.params as { orderId?: string }

      if (!orderId || !UUID_PATTERN.test(orderId)) {
        response.status(400).json({ success: false, message: 'Valid orderId is required.' })
        return
      }

      const order = await paymentService.getOrder(orderId)

      if (!order) {
        response.status(404).json({ success: false, message: 'Order not found.' })
        return
      }

      // Ensure the student owns this order
      if (order.student_id !== studentId) {
        response.status(403).json({ success: false, message: 'Not allowed to view this order.' })
        return
      }

      response.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          status: order.status,
          amount: order.amount,
          transferContent: order.transfer_content,
          providerTransactionId: order.provider_transaction_id,
          paidAt: order.paid_at,
          expiredAt: order.expired_at,
          createdAt: order.created_at,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async sepayWebhook(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const rawBody = request.body as unknown

      const event = this.parseSePayWebhook(rawBody)

      const result = await paymentService.handleSePayWebhook(event)

      // Acknowledge receipt to SePay so they stop retrying
      response.status(200).json({
        success: true,
        message: 'Webhook processed',
        data: {
          orderId: result.orderId,
          status: result.status,
          isNewlyPaid: result.isNewlyPaid,
        },
      })
    } catch (error) {
      // Still return 200 for malformed/unprocessable webhooks when appropriate
      // to avoid SePay retry storms for permanently invalid payloads, but log
      // the error. Return 400 only for clearly malformed requests.
      const message = error instanceof Error ? error.message : 'Webhook processing failed'
      console.error('[SePayWebhook] Error:', message)
      response.status(400).json({ success: false, message })
    }
  }

  private parseSePayWebhook(body: unknown): SePayWebhookEvent {
    if (!body || typeof body !== 'object') {
      throw new Error('Invalid webhook payload: body must be an object')
    }

    const record = body as Record<string, unknown>

    // SePay webhook may nest transaction data under common keys
    const transaction =
      (record.transaction as Record<string, unknown> | undefined) ??
      (record.data as Record<string, unknown> | undefined) ??
      record

    const amountIn =
      Number(record.amountIn ?? transaction.amountIn ?? transaction.amount ?? 0)
    const content =
      String(record.content ?? transaction.content ?? transaction.description ?? '')
    const reference =
      (record.reference ?? transaction.reference ?? transaction.order_invoice_number ??
        null) as string | null
    const transactionId =
      (record.transactionId ??
        transaction.transactionId ??
        transaction.transaction_id ??
        record.transaction_id ??
        null) as string | null
    const type = String(record.type ?? transaction.type ?? '')

    return {
      type,
      amountIn,
      content,
      reference,
      transactionId,
      raw: record,
    }
  }
}

export const paymentController = new PaymentController()
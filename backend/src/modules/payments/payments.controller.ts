import type { Request, Response, NextFunction } from 'express'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../../config/env.js'
import { PaymentWebhookError } from './payments.errors.js'
import { paymentService } from './payments.service.js'
import { subscribeToOrderStatus } from './order-status-realtime.service.js'
import type { SePayWebhookEvent } from './payments.types.js'
import type { SePayBankTransactionWebhook } from './payments.types.js'

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

      const { courseId } = request.body as {
        courseId?: unknown
      }

      if (!courseId || typeof courseId !== 'string' || !UUID_PATTERN.test(courseId)) {
        response.status(400).json({ success: false, message: 'Valid courseId is required.' })
        return
      }

      const { order, checkoutMode, checkoutUrl, checkoutFields, paymentInformation, customer, course } = await paymentService.createOrder({
        studentId,
        courseId,
      })

      response.status(201).json({
        success: true,
        data: {
          orderId: order.id,
          status: order.status,
          amount: order.amount,
          transferContent: order.transfer_content,
          expiredAt: order.expired_at,
          checkoutMode,
          checkoutUrl,
          checkoutFields,
          paymentInformation,
          customer,
          course,
          createdAt: order.created_at,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  async sepayBankWebhook(
    request: Request,
    response: Response,
  ): Promise<void> {
    try {
      if (env.sepayCheckoutMode !== 'direct_qr') {
        response.status(503).json({ success: false, message: 'Direct bank QR payments are not enabled.' })
        return
      }
      const secret = env.sepayBankWebhookSecret
      const rawBody = (request as Request & { rawBody?: Buffer }).rawBody
      const timestampHeader = request.header('X-SePay-Timestamp') ?? ''
      const signature = request.header('X-SePay-Signature') ?? ''
      const timestamp = Number(timestampHeader)
      if (!secret || !rawBody || !/^\d+$/.test(timestampHeader) || !Number.isSafeInteger(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) {
        response.status(401).json({ success: false, message: 'Invalid SePay webhook authentication.' })
        return
      }
      const signatureMatch = /^sha256=([a-f0-9]{64})$/i.exec(signature)
      if (!signatureMatch?.[1]) {
        response.status(401).json({ success: false, message: 'Invalid SePay webhook authentication.' })
        return
      }
      const expected = createHmac('sha256', secret)
        .update(`${timestampHeader}.`)
        .update(rawBody)
        .digest()
      const received = Buffer.from(signatureMatch[1], 'hex')
      if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        response.status(401).json({ success: false, message: 'Invalid SePay webhook authentication.' })
        return
      }
      if (!request.is('application/json')) {
        response.status(415).json({ success: false, message: 'Content-Type must be application/json.' })
        return
      }

      const body = request.body as Partial<SePayBankTransactionWebhook> | null
      if (!body || typeof body !== 'object' || typeof body.content !== 'string' ||
        typeof body.accountNumber !== 'string' || typeof body.transferType !== 'string') {
        throw new PaymentWebhookError('Invalid SePay bank transaction payload.', 400)
      }
      const event: SePayBankTransactionWebhook = {
        id: Number(body.id),
        gateway: String(body.gateway ?? ''),
        transactionDate: String(body.transactionDate ?? ''),
        accountNumber: body.accountNumber,
        subAccount: typeof body.subAccount === 'string' ? body.subAccount : undefined,
        code: typeof body.code === 'string' ? body.code : null,
        content: body.content,
        transferType: body.transferType,
        transferAmount: body.transferAmount ?? 0,
        referenceCode: typeof body.referenceCode === 'string' ? body.referenceCode : undefined,
      }
      const result = await paymentService.handleSePayBankWebhook(event)
      response.status(200).json({
        success: true,
        message: 'Bank transfer notification processed.',
        data: { orderId: result.orderId, status: result.status, isNewlyPaid: result.isNewlyPaid },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed'
      console.error('[SePayBankWebhook] Error:', message)
      const statusCode = error instanceof PaymentWebhookError ? error.statusCode : 500
      response.status(statusCode).json({ success: false, message })
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

      let courseDetails: Awaited<ReturnType<typeof paymentService.getCourseDetails>> = null
      let courseDetailsUnavailable = false
      if (order.status === 'paid') {
        try {
          courseDetails = await paymentService.getCourseDetails(order.course_id)
          if (!courseDetails) courseDetailsUnavailable = true
        } catch {
          courseDetailsUnavailable = true
        }
      }

      response.setHeader('Cache-Control', 'private, no-store, max-age=0')
      response.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          courseId: order.course_id,
          courseTitle: await paymentService.getCourseTitle(order.course_id),
          courseDetails,
          courseDetailsUnavailable,
          status: order.status,
          amount: order.amount,
          paymentMethod: order.provider === 'sepay' ? 'BANK_TRANSFER' : null,
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

  async streamOrderStatus(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const user = response.locals.authUser as { id?: string } | undefined
    const studentId = String(user?.id ?? '')
    const { orderId } = request.params as { orderId?: string }
    if (!orderId || !UUID_PATTERN.test(orderId)) {
      response.status(400).json({ success: false, message: 'Valid orderId is required.' })
      return
    }

    try {
      const order = await paymentService.getOrder(orderId)
      if (!order) {
        response.status(404).json({ success: false, message: 'Order not found.' })
        return
      }
      if (order.student_id !== studentId) {
        response.status(403).json({ success: false, message: 'Not allowed to view this order.' })
        return
      }

      response.status(200)
      response.set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      })
      response.flushHeaders()
      const send = (event: string, data: unknown) => {
        if (!response.writableEnded) response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      }
      let lastStatus: string | undefined
      const sendStatus = (status: string) => {
        // Repeated UPDATE notifications are harmless and need not redraw the UI.
        if (status === lastStatus) return
        lastStatus = status
        send('order', { orderId, status })
      }

      let unsubscribe: (() => void) | undefined
      let heartbeat: ReturnType<typeof setInterval> | undefined
      const close = () => {
        if (heartbeat) clearInterval(heartbeat)
        unsubscribe?.()
      }
      response.once('close', close)
      send('connection', { status: 'connecting' })
      heartbeat = setInterval(() => {
        if (!response.writableEnded) response.write(': keep-alive\n\n')
      }, 15_000)
      heartbeat.unref()

      try {
        unsubscribe = subscribeToOrderStatus(orderId, sendStatus, (status) => {
          send('connection', { status })
          if (status !== 'subscribed') return
          // Subscribe first, then read the row. This catches a paid transition
          // that committed just before Realtime became ready.
          void paymentService.getOrder(orderId)
            .then((current) => {
              if (!current || current.student_id !== studentId) {
                send('connection', { status: 'unavailable' })
                return
              }
              sendStatus(current.status)
            })
            .catch(() => send('connection', { status: 'unavailable' }))
        })
      } catch {
        send('connection', { status: 'unavailable' })
      }
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
      const expectedSecret = env.sepayIpnSecretKey
      if (!expectedSecret || request.header('X-Secret-Key') !== expectedSecret) {
        response.status(401).json({ success: false, message: 'Invalid IPN secret key.' })
        return
      }

      const rawBody = request.body as unknown
      if (!request.is('application/json')) {
        response.status(415).json({ success: false, message: 'Content-Type must be application/json.' })
        return
      }
      if (!rawBody || typeof rawBody !== 'object') throw new PaymentWebhookError('Invalid webhook payload: body must be an object', 400)
      const notificationType = String((rawBody as Record<string, unknown>).notification_type ?? '')
      if (notificationType === 'TRANSACTION_VOID') {
        const timestamp = Number((rawBody as Record<string, unknown>).timestamp)
        if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new PaymentWebhookError('Invalid webhook timestamp', 400)
        response.status(200).json({ success: true, message: 'Notification acknowledged.' })
        return
      }

      const event = this.parseSePayWebhook(rawBody)

      const result = await paymentService.handleSePayWebhook(event)

      // 2. Acknowledge receipt to SePay so they stop retrying
      // Must return HTTP 200 with {"success": true}
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
      const message = error instanceof Error ? error.message : 'Webhook processing failed'
      console.error('[SePayWebhook] Error:', message)
      const statusCode = error instanceof PaymentWebhookError ? error.statusCode : 500
      response.status(statusCode).json({
        success: false,
        message,
      })
    }
  }

  private parseSePayWebhook(body: unknown): SePayWebhookEvent {
    if (!body || typeof body !== 'object') {
      throw new PaymentWebhookError('Invalid webhook payload: body must be an object', 400)
    }

    const record = body as Record<string, unknown>

    // SePay IPN sends data directly at root level with these exact fields:
    // timestamp, notification_type, order, transaction, customer
    const timestamp = Number(record.timestamp)
    const notification_type = String(record.notification_type ?? '')
    if (!Number.isSafeInteger(timestamp) || timestamp <= 0) throw new PaymentWebhookError('Invalid webhook timestamp', 400)
    if (notification_type !== 'ORDER_PAID') throw new PaymentWebhookError('Unsupported SePay notification type', 400)

    // SePay's order.id is its own UUID; order_invoice_number is the merchant
    // invoice used to locate the platform order, while order_id is SePay's ref.
    const rawOrder = (record.order && typeof record.order === 'object'
      ? record.order
      : {}) as Record<string, unknown>

    // Transaction object
    const rawTransaction = (record.transaction && typeof record.transaction === 'object'
      ? record.transaction
      : {}) as Record<string, unknown>

    // Customer object
    const rawCustomer = (record.customer && typeof record.customer === 'object'
      ? record.customer
      : {}) as Record<string, unknown>

    // Validate the SePay order UUID format, but do not compare it to our DB ID.
    const order_id = typeof rawOrder.id === 'string' ? rawOrder.id : null
    if (!order_id || !UUID_PATTERN.test(order_id)) throw new PaymentWebhookError('Invalid SePay order ID', 400)
    const sepay_order_id = typeof rawOrder.order_id === 'string' ? rawOrder.order_id.trim() : ''
    if (!sepay_order_id) throw new PaymentWebhookError('Missing SePay payment reference', 400)

    // Extract amount from transaction
    const amount = Number(rawTransaction.transaction_amount)
    if (!Number.isFinite(amount) || amount <= 0) throw new PaymentWebhookError('Invalid transaction amount', 400)

    // Extract transaction status
    const transaction_status = String(rawTransaction.transaction_status ?? rawOrder.order_status ?? '')

    // Extract notification type
    const type = notification_type ?? ''

    // Extract transaction ID
    const transaction_id = typeof rawTransaction.transaction_id === 'string' ? rawTransaction.transaction_id : null
    if (notification_type === 'ORDER_PAID' && !transaction_id) throw new PaymentWebhookError('Missing SePay transaction ID', 400)

    const orderCurrency = String(rawOrder.order_currency ?? '')
    const orderAmount = rawOrder.order_amount as string | number
    if (!Number.isFinite(Number(orderAmount)) || Number(orderAmount) <= 0) throw new PaymentWebhookError('Invalid SePay order amount', 400)
    if (typeof rawOrder.order_invoice_number !== 'string' || !rawOrder.order_invoice_number) throw new PaymentWebhookError('Missing SePay invoice number', 400)

    return {
      type,
      timestamp,
      notification_type,
      order: {
        id: order_id ?? '',
        order_id: sepay_order_id,
        order_status: String(rawOrder.order_status ?? ''),
        order_currency: orderCurrency,
        order_amount: orderAmount,
        order_invoice_number: typeof rawOrder.order_invoice_number === 'string' ? rawOrder.order_invoice_number : '',
        custom_data: Array.isArray(rawOrder.custom_data) ? rawOrder.custom_data : [],
        user_agent: String(rawOrder.user_agent ?? ''),
        ip_address: String(rawOrder.ip_address ?? ''),
        order_description: String(rawOrder.order_description ?? ''),
      },
      transaction: {
        id: String(rawTransaction.id ?? transaction_id ?? ''),
        payment_method: String(rawTransaction.payment_method ?? ''),
        transaction_id: transaction_id ?? '',
        transaction_type: String(rawTransaction.transaction_type ?? ''),
        transaction_date: String(rawTransaction.transaction_date ?? ''),
        transaction_status: transaction_status,
        transaction_amount: rawTransaction.transaction_amount !== undefined ? (rawTransaction.transaction_amount as string | number) : amount,
        transaction_currency: String(rawTransaction.transaction_currency ?? ''),
        authentication_status: String(rawTransaction.authentication_status ?? ''),
        card_number: String(rawTransaction.card_number ?? ''),
        card_holder_name: String(rawTransaction.card_holder_name ?? ''),
        card_expiry: String(rawTransaction.card_expiry ?? ''),
        card_funding_method: String(rawTransaction.card_funding_method ?? ''),
        card_brand: String(rawTransaction.card_brand ?? ''),
      },
      customer: {
        id: String(rawCustomer.id ?? ''),
        customer_id: String(rawCustomer.customer_id ?? ''),
      },
      raw: record,
    }
  }
}

export const paymentController = new PaymentController()

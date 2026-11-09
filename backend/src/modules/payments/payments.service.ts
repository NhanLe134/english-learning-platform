import { randomUUID } from 'node:crypto'
import { env } from '../../config/env.js'
import { getSePayClient } from '../../config/sepay.js'
import { PaymentWebhookError } from './payments.errors.js'
import {
  PaymentOrderRepository,
  paymentOrderRepository,
} from './payments.repository.js'
import type {
  PaymentOrder,
  PaymentOrderStatus,
  SePayWebhookEvent,
  VerifyPaymentResult,
} from './payments.types.js'

const ORDER_HOLD_MINUTES = 15

export class PaymentService {
  constructor(private readonly repository: PaymentOrderRepository = paymentOrderRepository) {}

  async createOrder(input: { studentId: string; courseId: string }): Promise<{
    order: PaymentOrder
    checkoutUrl: string
    checkoutFields: Record<string, string | number>
    course: { id: string; title: string; price: number }
  }> {
    const course = await this.repository.findPublishedCourse(input.courseId)
    if (!course) throw new Error('Course not found or no longer available.')
    const amount = course.discounted_price ?? course.price
    if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Course price is invalid.')
    const sepay = getSePayClient()
    const id = randomUUID()
    const transferContent = `DH${id}`
    const order = await this.repository.createOrder({
      ...input,
      id,
      amount,
      transferContent,
      expiredAt: new Date(Date.now() + ORDER_HOLD_MINUTES * 60 * 1000).toISOString(),
    })
    const checkoutFields = sepay.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: transferContent,
      order_amount: order.amount,
      currency: 'VND',
      order_description: `Course: ${course.title} (${transferContent})`,
      customer_id: order.student_id,
      success_url: `${env.frontendUrl}/checkout/success?orderId=${encodeURIComponent(order.id)}`,
      error_url: `${env.frontendUrl}/checkout?payment=error&orderId=${encodeURIComponent(order.id)}`,
      cancel_url: `${env.frontendUrl}/checkout?payment=cancel&orderId=${encodeURIComponent(order.id)}`,
    })
    return {
      order,
      checkoutUrl: sepay.checkout.initCheckoutUrl(),
      checkoutFields,
      course: { id: course.id, title: course.title, price: amount },
    }
  }

  async getOrder(orderId: string): Promise<PaymentOrder | null> {
    const order = await this.repository.findOrderById(orderId)
    if (order?.status === 'pending' && order.expired_at && Date.parse(order.expired_at) <= Date.now()) {
      return (await this.repository.markOrderExpired(order.id)) ?? order
    }
    return order
  }

  async getCourseTitle(courseId: string): Promise<string | null> {
    return this.repository.findCourseTitle(courseId)
  }

  async expireStaleOrders(): Promise<void> {
    const now = new Date().toISOString()
    // Mark pending orders whose expired_at has passed as expired
    await createSupabaseClientExpired(now)
  }

  async handleSePayWebhook(event: SePayWebhookEvent): Promise<VerifyPaymentResult> {
    const invoiceNumber = event.order.order_invoice_number
    const sepayOrderId = event.order.order_id
    const transactionId = event.transaction.transaction_id
    const amountIn = Number(event.transaction.transaction_amount)

    // Validate incoming amount
    if (!Number.isFinite(amountIn) || amountIn <= 0) {
      throw new PaymentWebhookError('Invalid webhook amount: transaction amount must be greater than zero', 422)
    }

    if (!sepayOrderId.trim()) throw new PaymentWebhookError('Missing SePay payment reference.', 422)

    // The merchant invoice is the platform order lookup key. SePay's order.id
    // is its own UUID; order.order_id is the gateway reference persisted below.
    const order = await this.repository.findOrderByTransferContent(invoiceNumber)
    if (!order) {
      throw new PaymentWebhookError(`Course order not found for invoice number: ${invoiceNumber}`, 404)
    }
    if (order.provider_order_id && order.provider_order_id !== sepayOrderId) {
      throw new PaymentWebhookError('SePay payment reference does not match the stored reference.', 422)
    }
    if (event.notification_type !== 'ORDER_PAID' || event.transaction.transaction_status !== 'APPROVED') {
      throw new PaymentWebhookError('SePay notification does not represent an approved payment.', 422)
    }
    if (event.order.order_status !== 'CAPTURED' || event.transaction.transaction_type !== 'PAYMENT' || event.transaction.payment_method !== 'BANK_TRANSFER') {
      throw new PaymentWebhookError('SePay order, transaction state, or payment method is invalid.', 422)
    }
    if (order.currency !== 'VND' || event.order.order_currency !== order.currency || event.transaction.transaction_currency !== order.currency) {
      throw new PaymentWebhookError('Unsupported payment currency.', 422)
    }

    if (amountIn !== order.amount || Number(event.order.order_amount) !== order.amount) {
      throw new PaymentWebhookError(
        `Amount mismatch: webhook amount ${amountIn} does not match order amount ${order.amount}`,
        422,
      )
    }

    if (order.status === 'expired' || order.status === 'cancelled' || order.status === 'failed') throw new PaymentWebhookError('Order is no longer payable.', 422)
    const result = await this.repository.markOrderPaid(order.id, sepayOrderId, transactionId, amountIn)

    // Retry enrollment when payment was committed but an earlier IPN failed before enrollment.
    await this.repository.createEnrollment(order.student_id, order.course_id)

    return {
      orderId: result.order.id,
      status: result.order.status,
      amount: result.order.amount,
      transferContent: result.order.transfer_content,
      providerTransactionId: result.order.provider_transaction_id,
      isNewlyPaid: result.isNewlyPaid,
    }
  }
}

export const paymentService = new PaymentService()

/* Helper: expire orders past their expired_at using the service-role client */
async function createSupabaseClientExpired(now: string): Promise<void> {
  const { createSupabaseClient } = await import('../../config/supabase.js')
  const { error } = await createSupabaseClient()
    .from('course_orders')
    .update({ status: 'expired', updated_at: now })
    .eq('status', 'pending')
    .lt('expired_at', now)

  if (error) {
    console.error('[PaymentService] Failed to expire stale orders:', error.message)
  }
}

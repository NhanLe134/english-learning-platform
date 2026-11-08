import { env } from '../../config/env.js'
import { getSePayClient, buildVietQrUrl, extractOrderIdFromContent } from '../../config/sepay.js'
import {
  PaymentOrderRepository,
  paymentOrderRepository,
} from './payments.repository.js'
import type {
  CreatePaymentOrderInput,
  PaymentOrder,
  PaymentOrderStatus,
  SePayWebhookEvent,
  VerifyPaymentResult,
} from './payments.types.js'

const ORDER_HOLD_MINUTES = 15

export class PaymentService {
  constructor(private readonly repository: PaymentOrderRepository = paymentOrderRepository) {}

  async createOrder(input: CreatePaymentOrderInput): Promise<{
    order: PaymentOrder
    vietQrUrl: string
  }> {
    const order = await this.repository.createOrder(input)

    // SePay VietQR requires merchant account details. These come from env or
    // fall back to sensible placeholders that must be configured for production.
    const bankCode = env.sepayMerchantId // merchant id used as bank identifier placeholder
    const accountNumber = env.sepayMerchantId
    const accountName = 'Your English Voice'

    // In a real integration the bank code and account number are the SePay
    // merchant's registered VietQR account. Here we build the VietQR URL from
    // configured values so the QR contains the exact transfer content (DH{order_id})
    // and amount so the student's banking app pre-fills the transfer.
    const vietQrUrl = buildVietQrUrl({
      bankCode: String(bankCode || 'sepay'),
      accountNumber: String(accountNumber || 'sepay'),
      amount: order.amount,
      transferContent: order.transfer_content,
      accountName,
    })

    return { order, vietQrUrl }
  }

  async getOrder(orderId: string): Promise<PaymentOrder | null> {
    return this.repository.findOrderById(orderId)
  }

  async expireStaleOrders(): Promise<void> {
    const now = new Date().toISOString()
    // Mark pending orders whose expired_at has passed as expired
    await createSupabaseClientExpired(now)
  }

  async handleSePayWebhook(event: SePayWebhookEvent): Promise<VerifyPaymentResult> {
    const { amountIn, content, reference, transactionId } = event

    // Validate incoming amount
    if (!amountIn || amountIn <= 0) {
      throw new Error('Invalid webhook amount: amountIn must be greater than zero')
    }

    if (!content) {
      throw new Error('Invalid webhook payload: transfer content is required')
    }

    // Extract order id from transfer content, e.g. DH{order_id}
    const orderId = extractOrderIdFromContent(content)
    if (!orderId) {
      throw new Error(`Unable to parse order id from transfer content: ${content}`)
    }

    const order = await this.repository.findOrderById(orderId)
    if (!order) {
      throw new Error(`Course order not found for order id: ${orderId}`)
    }

    // Idempotency: if already paid, return without changes
    if (order.status === 'paid') {
      return {
        orderId: order.id,
        status: order.status,
        amount: order.amount,
        transferContent: order.transfer_content,
        providerTransactionId: order.provider_transaction_id,
        isNewlyPaid: false,
      }
    }

    // Amount tolerance: allow small rounding differences (±100 VND)
    const amountTolerance = 100
    if (Math.abs(amountIn - order.amount) > amountTolerance) {
      throw new Error(
        `Amount mismatch: webhook amount ${amountIn} does not match order amount ${order.amount}`,
      )
    }

    const result = await this.repository.markOrderPaid(order.id, transactionId, amountIn)

    // Grant course access only when newly paid
    if (result.isNewlyPaid) {
      await this.repository.createEnrollment(order.student_id, order.course_id)
    }

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
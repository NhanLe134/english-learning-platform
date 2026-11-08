export type PaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'

export interface PaymentOrder {
  id: string
  student_id: string
  course_id: string
  amount: number
  currency: string
  status: PaymentOrderStatus
  transfer_content: string
  provider: string
  provider_transaction_id: string | null
  paid_at: string | null
  expired_at: string | null
  created_at: string
  updated_at: string
}

export interface CreatePaymentOrderInput {
  studentId: string
  courseId: string
  amount: number
  transferContent: string
  expiredAt: string
}

export interface PaymentOrderRow extends Omit<PaymentOrder, 'amount'> {
  amount: number | string
}

export interface VerifyPaymentResult {
  orderId: string
  status: PaymentOrderStatus
  amount: number
  transferContent: string
  providerTransactionId: string | null
  isNewlyPaid: boolean
}

export interface SePayWebhookEvent {
  type: string
  amountIn: number
  content: string
  reference: string | null
  transactionId: string | null
  raw: unknown
}
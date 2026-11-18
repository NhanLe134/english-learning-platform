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
  provider_order_id: string | null
  provider_transaction_id: string | null
  paid_at: string | null
  expired_at: string | null
  created_at: string
  updated_at: string
}

export interface CreatePaymentOrderInput {
  id: string
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
  provider?: string | null
  providerTransactionId: string | null
  isNewlyPaid: boolean
}

export interface SePayWebhookEvent {
  type: string
  timestamp: number
  notification_type: string
  order: {
    id: string
    order_id: string
    order_status: string
    order_currency: string
    order_amount: number | string
    order_invoice_number: string
    custom_data: unknown[]
    user_agent: string
    ip_address: string
    order_description: string
  }
  transaction: {
    id: string
    payment_method: string
    transaction_id: string
    transaction_type: string
    transaction_date: string
    transaction_status: string
    transaction_amount: number | string
    transaction_currency: string
    authentication_status: string
    card_number: string
    card_holder_name: string
    card_expiry: string
    card_funding_method: string
    card_brand: string
  }
  customer: {
    id: string
    customer_id: string
  }
  raw: unknown
}

export interface SePayBankTransactionWebhook {
  id: number
  gateway: string
  transactionDate: string
  accountNumber: string
  subAccount?: string
  code?: string | null
  content: string
  transferType: string
  transferAmount: number | string
  referenceCode?: string
}

/* ============================================================
   Admin Payment Management types
   ============================================================ */

export type AdminOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'

export type AdminOrderAction = 'view' | 'reconcile_enrollment' | 'export'

export interface AdminOrderListItem {
  orderId: string
  studentId: string
  studentName: string
  studentEmail: string
  studentPhone: string | null
  courseId: string
  courseTitle: string
  courseSlug: string | null
  amount: number
  currency: string
  status: AdminOrderStatus
  transferContent: string
  provider?: string | null
  providerTransactionId: string | null
  paidAt: string | null
  createdAt: string
  enrollmentStatus: 'active' | 'completed' | 'cancelled' | null
  enrollmentId: string | null
  needsAttention: boolean
}

export interface AdminOrderDetail extends AdminOrderListItem {
  providerOrderId: string | null
  expiredAt: string | null
  updatedAt: string
}

export interface AdminOrderQueryParams {
  search?: string
  status?: 'ALL' | AdminOrderStatus
  enrollment?: 'ALL' | 'has_enrollment' | 'missing_enrollment'
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
  sortBy?: 'created_at' | 'paid_at' | 'amount' | 'student_name' | 'course_title'
  sortOrder?: 'asc' | 'desc'
}

export interface AdminPaymentActionLog {
  id: string
  adminId: string
  orderId: string
  action: AdminOrderAction
  details: Record<string, unknown> | null
  createdAt: string
}

/* ============================================================
   Payment statistics
   ============================================================ */

export interface PaymentStatistics {
  totalOrders: number
  totalPaid: number
  totalPending: number
  totalFailed: number
  totalAmount: number
}

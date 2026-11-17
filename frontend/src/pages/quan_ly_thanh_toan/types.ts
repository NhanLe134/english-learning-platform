export type PaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' | 'refunded'

export type EnrollmentStatus = 'active' | 'completed' | 'cancelled' | null

export interface AdminPaymentOrder {
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
  status: PaymentOrderStatus
  transferContent: string
  provider?: string | null
  providerTransactionId: string | null
  paidAt: string | null
  createdAt: string
  providerOrderId: string | null
  expiredAt: string | null
  updatedAt: string
  enrollmentStatus: EnrollmentStatus
  enrollmentId: string | null
  needsAttention: boolean
  studentAddress?: string | null
  courseInstructor?: string | null
}

export interface PaymentOrderQueryParams {
  search: string
  status: 'ALL' | PaymentOrderStatus
  enrollment: 'ALL' | 'has_enrollment' | 'missing_enrollment'
  courseId?: string
  dateFrom: string
  dateTo: string
  page: number
  limit: number
  sortBy: 'created_at' | 'paid_at' | 'amount' | 'student_name' | 'course_title'
  sortOrder: 'asc' | 'desc'
}

export interface PaginatedPaymentOrders {
  items: AdminPaymentOrder[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReconcileResult {
  orderId: string
  status: string
  enrollmentCreated: boolean
  enrollmentId: string | null
  enrollmentStatus: string | null
  message: string
}

export interface AdminPaymentAction {
  id: string
  adminId: string
  orderId: string
  action: 'view' | 'reconcile_enrollment' | 'export'
  details: Record<string, unknown> | null
  createdAt: string
}

export interface PaymentFilterState {
  search: string
  status: 'ALL' | PaymentOrderStatus
  enrollment: 'ALL' | 'has_enrollment' | 'missing_enrollment'
  courseId?: string
  dateFrom: string
  dateTo: string
  page: number
  limit: number
  sortBy: 'created_at' | 'paid_at' | 'amount' | 'student_name' | 'course_title'
  sortOrder: 'asc' | 'desc'
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaymentStatistics {
  totalOrders: number
  totalPaid: number
  totalPending: number
  totalFailed: number
  totalAmount: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data?: T
  pagination?: PaginationInfo
}

export const initialFilterState: PaymentFilterState = {
  search: '',
  status: 'ALL',
  enrollment: 'ALL',
  courseId: undefined,
  dateFrom: '',
  dateTo: '',
  page: 1,
  limit: 20,
  sortBy: 'created_at',
  sortOrder: 'desc',
}

export const initialPagination: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
}

export const statusLabels: Record<PaymentOrderStatus, string> = {
  pending: 'Đang chờ',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  expired: 'Đã hết hạn',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
}

export const enrollmentLabels: Record<Exclude<EnrollmentStatus, null>, string> = {
  active: 'Đang học',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

export const statusColors: Record<PaymentOrderStatus, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  failed: 'bg-rose-50 text-rose-700 border-rose-100',
  expired: 'bg-gray-50 text-gray-700 border-gray-100',
  cancelled: 'bg-gray-50 text-gray-700 border-gray-100',
  refunded: 'bg-gray-50 text-gray-700 border-gray-100',
}

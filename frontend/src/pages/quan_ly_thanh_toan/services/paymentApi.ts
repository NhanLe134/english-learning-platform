import type {
  ApiResponse,
  AdminPaymentOrder,
  PaginatedPaymentOrders,
  PaymentOrderQueryParams,
  PaymentStatistics,
  ReconcileResult,
} from '../types'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'

class PaymentApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'PaymentApiError'
  }
}

function authHeaders(accessToken: string | null): Headers {
  if (!accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
  return new Headers({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  })
}

async function authenticatedFetch(
  url: string,
  init: RequestInit,
  accessToken: string | null,
  refreshAccessToken: () => Promise<string>
): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers)
    const authorization = authHeaders(token).get('Authorization')
    if (authorization) headers.set('Authorization', authorization)
    return fetch(url, { ...init, headers, credentials: 'include' })
  }

  let response = await send(accessToken)
  if (response.status === 401) {
    const refreshedToken = await refreshAccessToken()
    response = await send(refreshedToken)
  }
  return response
}

export const paymentApi = {
  /**
   * Fetch paginated payment orders from backend API
   */
  async getOrders(
    filters: PaymentOrderQueryParams,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<PaginatedPaymentOrders> {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status)
    if (filters.enrollment && filters.enrollment !== 'ALL') params.append('enrollment', filters.enrollment)
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.append('dateTo', filters.dateTo)
    params.append('page', String(filters.page))
    params.append('limit', String(filters.limit))
    params.append('sortBy', filters.sortBy)
    params.append('sortOrder', filters.sortOrder)

    const response = await authenticatedFetch(
      `${API_BASE_URL}/payment/admin/orders?${params.toString()}`,
      { method: 'GET', headers: authHeaders(accessToken) },
      accessToken,
      refreshAccessToken
    )

    const json: ApiResponse<AdminPaymentOrder[]> = await response.json()
    if (!response.ok || !json.success) {
      throw new PaymentApiError(
        json.message || 'Không thể lấy danh sách đơn hàng thanh toán',
        response.status
      )
    }

    return {
      items: json.data || [],
      total: json.pagination?.total ?? (json.data || []).length,
      page: json.pagination?.page ?? filters.page,
      limit: json.pagination?.limit ?? filters.limit,
      totalPages: json.pagination?.totalPages ?? Math.max(1, Math.ceil((json.data || []).length / filters.limit)),
    }
  },

  /**
   * Fetch payment statistics from backend API
   */
  async getStatistics(
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<PaymentStatistics> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/payment/admin/statistics`,
      { method: 'GET', headers: authHeaders(accessToken) },
      accessToken,
      refreshAccessToken
    )

    const json: ApiResponse<PaymentStatistics> = await response.json()
    if (!response.ok || !json.success) {
      throw new PaymentApiError(
        json.message || 'Không thể lấy thống kê thanh toán',
        response.status
      )
    }

    if (!json.data) throw new Error('Không tìm thấy dữ liệu thống kê.')
    return json.data
  },

  /**
   * Fetch a single payment order detail by ID
   */
  async getOrderDetail(
    orderId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<AdminPaymentOrder> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/payment/admin/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET', headers: authHeaders(accessToken) },
      accessToken,
      refreshAccessToken
    )

    const json: ApiResponse<AdminPaymentOrder> = await response.json()
    if (!response.ok || !json.success) {
      throw new PaymentApiError(
        json.message || 'Không thể lấy chi tiết đơn hàng',
        response.status
      )
    }

    if (!json.data) throw new Error('Không tìm thấy đơn hàng.')
    return json.data
  },

  /**
   * Reconcile a paid order that is missing enrollment
   */
  async reconcileOrder(
    orderId: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<ReconcileResult> {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/payment/admin/orders/${encodeURIComponent(orderId)}/reconcile`,
      {
        method: 'POST',
        headers: authHeaders(accessToken),
      },
      accessToken,
      refreshAccessToken
    )

    const json: ApiResponse<ReconcileResult> = await response.json()
    if (!response.ok || !json.success) {
      throw new PaymentApiError(
        json.message || 'Khôi phục đăng ký thất bại',
        response.status
      )
    }

    if (!json.data) throw new Error('Khôi phục đăng ký không trả về dữ liệu.')
    return json.data
  },

  /**
   * Export payment orders to CSV file with UTF-8 BOM for Microsoft Excel compatibility
   */
  exportOrdersToCsv(orders: AdminPaymentOrder[], filename?: string): void {
    const headers = [
      'STT',
      'Mã đơn hàng',
      'Mã hóa đơn',
      'Họ và tên học viên',
      'Email',
      'Số điện thoại',
      'Khóa học',
      'Số tiền (VND)',
      'Cổng thanh toán',
      'Trạng thái thanh toán',
      'Kích hoạt khóa học',
      'Thời gian tạo',
      'Thời gian thanh toán',
      'Mã tham chiếu giao dịch',
    ]

    const statusLabels: Record<string, string> = {
      paid: 'Đã thanh toán',
      pending: 'Chưa thanh toán',
      failed: 'Thất bại',
      expired: 'Hết hạn',
      cancelled: 'Đã hủy',
    }

    const formatField = (val: unknown): string => {
      if (val === null || val === undefined) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const rows = orders.map((order, index) => {
      const statusText = statusLabels[order.status] || order.status
      const enrollmentText = order.enrollmentStatus === 'active'
        ? 'Đã kích hoạt'
        : (order.enrollmentStatus ? order.enrollmentStatus : 'Chưa kích hoạt')
      const providerText = order.provider || 'Chuyển khoản'

      return [
        index + 1,
        order.orderId,
        order.transferContent || order.orderId,
        order.studentName || '',
        order.studentEmail || '',
        order.studentPhone || '',
        order.courseTitle || '',
        order.amount,
        providerText,
        statusText,
        enrollmentText,
        order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '',
        order.paidAt ? new Date(order.paidAt).toLocaleString('vi-VN') : '',
        order.providerTransactionId || '',
      ].map(formatField).join(',')
    })

    const csvContent = '\uFEFF' + [headers.map(formatField).join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `danh_sach_don_hang_thanh_toan_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  },
}

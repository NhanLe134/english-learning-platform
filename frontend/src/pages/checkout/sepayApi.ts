const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

interface CreateOrderRequest {
  courseId: string
  amount: number
  transferContent: string
  expiredAt: string
}

interface CreateOrderResponse {
  orderId: string
  status: string
  amount: number
  transferContent: string
  expiredAt: string | null
  vietQrUrl: string
  createdAt: string
}

interface OrderStatusResponse {
  orderId: string
  status: string
  amount: number
  transferContent: string
  providerTransactionId: string | null
  paidAt: string | null
  expiredAt: string | null
  createdAt: string
}

async function request<T>(
  path: string,
  init: RequestInit,
  accessToken: string | null,
): Promise<ApiResponse<T>> {
  const headers = new Headers(init.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE_URL}/payment${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  let result: ApiResponse<T>
  try {
    result = (await response.json()) as ApiResponse<T>
  } catch {
    throw new Error('Máy chủ trả về dữ liệu thanh toán không hợp lệ.')
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || `Yêu cầu thanh toán thất bại (HTTP ${response.status}).`)
  }
  return result
}

export const sepayApi = {
  async createOrder(
    input: CreateOrderRequest,
    accessToken: string | null,
  ): Promise<CreateOrderResponse> {
    const response = await request<CreateOrderResponse>('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }, accessToken)
    if (!response.data) throw new Error('Máy chủ không trả về đơn hàng.')
    return response.data
  },

  async getOrderStatus(
    orderId: string,
    accessToken: string | null,
  ): Promise<OrderStatusResponse> {
    const response = await request<OrderStatusResponse>(
      `/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET' },
      accessToken,
    )
    if (!response.data) throw new Error('Máy chủ không trả về trạng thái đơn hàng.')
    return response.data
  },
}
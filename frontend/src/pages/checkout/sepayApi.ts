import type { CourseReference } from '../courses/course-data'
import { mapCourseCatalogRecord, type CourseCatalogRecord } from '../courses/services/courseCatalogApi'

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
}

export interface CreateOrderResponse {
  orderId: string
  status: string
  amount: number
  transferContent: string
  expiredAt: string | null
  checkoutMode: 'hosted' | 'direct_qr'
  checkoutUrl: string | null
  checkoutFields: Record<string, string | number> | null
  paymentInformation: {
    bankName: string
    accountNumber: string
    accountName: string
    qrCodeUrl: string
    amount: number
    transferContent: string
    expiresAt: string
  } | null
  customer: { id: string; fullName: string; email: string; phoneNumber: string | null }
  course: {
    id: string
    title: string
    slug: string
    description: string | null
    thumbnailUrl: string | null
    price: number
    originalPrice: number
    quantity: 1
  }
  createdAt: string
}

interface RawOrderStatusResponse {
  orderId: string
  courseId: string
  courseTitle: string | null
  status: string
  amount: number
  paymentMethod: string | null
  transferContent: string
  providerTransactionId: string | null
  paidAt: string | null
  expiredAt: string | null
  createdAt: string
  courseDetails: CourseCatalogRecord | null
  courseDetailsUnavailable: boolean
}

export interface OrderStatusResponse extends Omit<RawOrderStatusResponse, 'courseDetails'> {
  courseDetails: CourseReference | null
}

type OrderStreamMessage =
  | { kind: 'connection'; status: 'connecting' | 'subscribed' | 'unavailable' }
  | { kind: 'order'; orderId: string; status: string }

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
    const response = await request<RawOrderStatusResponse>(
      `/orders/${encodeURIComponent(orderId)}`,
      { method: 'GET', cache: 'no-store' },
      accessToken,
    )
    if (!response.data) throw new Error('Máy chủ không trả về trạng thái đơn hàng.')
    return {
      ...response.data,
      courseDetails: response.data.courseDetails
        ? mapCourseCatalogRecord(response.data.courseDetails)
        : null,
    }
  },

  watchOrderStatus(
    orderId: string,
    accessToken: string,
    onMessage: (message: OrderStreamMessage) => void,
  ): () => void {
    const abort = new AbortController()
    void (async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/payment/orders/${encodeURIComponent(orderId)}/events`,
          {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
            credentials: 'include',
            signal: abort.signal,
          },
        )
        if (!response.ok || !response.body) {
          onMessage({ kind: 'connection', status: 'unavailable' })
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (!abort.signal.aborted) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          buffer = buffer.replace(/\r\n/g, '\n')
          let boundary = buffer.indexOf('\n\n')
          while (boundary >= 0) {
            const frame = buffer.slice(0, boundary).replace(/\r/g, '')
            buffer = buffer.slice(boundary + 2)
            let event = ''
            let data = ''
            for (const line of frame.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim()
              else if (line.startsWith('data:')) data += line.slice(5).trim()
            }
            if (data) {
              try {
                const parsed = JSON.parse(data) as Record<string, unknown>
                if (event === 'connection' && ['connecting', 'subscribed', 'unavailable'].includes(String(parsed.status))) {
                  onMessage({ kind: 'connection', status: parsed.status as 'connecting' | 'subscribed' | 'unavailable' })
                } else if (event === 'order' && parsed.orderId === orderId && typeof parsed.status === 'string') {
                  onMessage({ kind: 'order', orderId, status: parsed.status })
                }
              } catch {
                // Ignore malformed frames and keep the stream alive.
              }
            }
            boundary = buffer.indexOf('\n\n')
          }
        }
        if (!abort.signal.aborted) onMessage({ kind: 'connection', status: 'unavailable' })
      } catch {
        if (!abort.signal.aborted) onMessage({ kind: 'connection', status: 'unavailable' })
      }
    })()
    return () => abort.abort()
  },
}

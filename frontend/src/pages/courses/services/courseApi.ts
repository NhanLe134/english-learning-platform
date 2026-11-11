import type { Course, CourseFilters, CourseInput, CoursePagination } from '../types'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
  pagination?: CoursePagination
}

async function authenticatedRequest<T>(
  path: string,
  init: RequestInit,
  accessToken: string | null,
  refreshAccessToken: () => Promise<string>
): Promise<ApiResponse<T>> {
  if (!accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')

  const send = (token: string) => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${API_BASE_URL}/courses/admin${path}`, {
      ...init,
      headers,
      credentials: 'include',
    })
  }

  let response = await send(accessToken)
  if (response.status === 401) {
    response = await send(await refreshAccessToken())
  }

  let result: ApiResponse<T>
  try {
    result = await response.json() as ApiResponse<T>
  } catch {
    throw new Error('Máy chủ trả về dữ liệu khóa học không hợp lệ.')
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || `Yêu cầu thất bại (HTTP ${response.status}).`)
  }
  return result
}

export const courseApi = {
  async list(
    filters: CourseFilters,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<{ courses: Course[]; pagination: CoursePagination }> {
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      status: filters.status,
      level: filters.level,
      sort: filters.sort,
    })
    if (filters.search.trim()) params.set('search', filters.search.trim())
    if (filters.category.trim()) params.set('category', filters.category.trim())

    const response = await authenticatedRequest<Course[]>(
      `?${params.toString()}`,
      { method: 'GET' },
      accessToken,
      refreshAccessToken
    )
    if (!Array.isArray(response.data) || !response.pagination) {
      throw new Error('Phản hồi danh sách khóa học không đúng định dạng.')
    }
    return { courses: response.data, pagination: response.pagination }
  },

  async create(
    input: CourseInput,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<Course> {
    const response = await authenticatedRequest<Course>(
      '',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
      accessToken,
      refreshAccessToken
    )
    if (!response.data) throw new Error('Máy chủ không trả về khóa học đã tạo.')
    return response.data
  },

  async update(
    id: string,
    input: CourseInput,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<Course> {
    const response = await authenticatedRequest<Course>(
      `/${encodeURIComponent(id)}`,
      { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
      accessToken,
      refreshAccessToken
    )
    if (!response.data) throw new Error('Máy chủ không trả về khóa học đã cập nhật.')
    return response.data
  },

  async updateStatus(
    id: string,
    status: 'draft' | 'published',
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<Course> {
    const response = await authenticatedRequest<Course>(
      `/${encodeURIComponent(id)}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      },
      accessToken,
      refreshAccessToken
    )
    if (!response.data) throw new Error('Máy chủ không trả về trạng thái khóa học.')
    return response.data
  },

  async remove(
    id: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<void> {
    await authenticatedRequest<unknown>(
      `/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      accessToken,
      refreshAccessToken
    )
  },
}

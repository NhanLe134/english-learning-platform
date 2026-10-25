import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { AuthApiError } from '../../auth/auth-api'
import type { ApiResponse, CreateUserInput, PaginationInfo, UserFilterState, UserProfile, UserRole, UserStatus } from '../types'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

class UserApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'UserApiError'
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

let directSupabaseClient: SupabaseClient | null = null

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  directSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}

export const userApi = {
  /**
   * Fetch paginated users from Supabase via backend API
   */
  async getUsers(
    filters: UserFilterState,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<{ data: UserProfile[]; pagination: PaginationInfo; source: 'supabase' }> {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.role && filters.role !== 'ALL') params.append('role', filters.role)
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status)
    params.append('page', String(filters.page))
    params.append('limit', String(filters.limit))
    const headers = authHeaders(accessToken)

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/users?${params.toString()}`, {
        method: 'GET',
        headers,
      }, accessToken, refreshAccessToken)

      const json: ApiResponse<UserProfile[]> = await response.json()

      if (!response.ok || !json.success) {
        throw new UserApiError(
          json.message || 'Không thể lấy dữ liệu từ Supabase qua API backend',
          response.status
        )
      }

      return {
        data: json.data || [],
        pagination: json.pagination || {
          page: filters.page,
          limit: filters.limit,
          total: (json.data || []).length,
          totalPages: Math.max(1, Math.ceil((json.data || []).length / filters.limit)),
        },
        source: 'supabase',
      }
    } catch (err: unknown) {
      if (err instanceof UserApiError && (err.status === 401 || err.status === 403)) {
        throw err
      }
      if (err instanceof AuthApiError) throw err
      // If direct Supabase client credentials are configured on frontend
      if (directSupabaseClient) {
        return this.getUsersDirectSupabase(filters)
      }

      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ'
      throw new Error(msg)
    }
  },

  /**
   * Fallback direct Supabase fetch if backend is not started but frontend .env has Supabase keys
   */
  async getUsersDirectSupabase(filters: UserFilterState): Promise<{ data: UserProfile[]; pagination: PaginationInfo; source: 'supabase' }> {
    if (!directSupabaseClient) {
      throw new Error('Chưa cấu hình Supabase')
    }

    const page = filters.page || 1
    const limit = filters.limit || 10
    const offset = (page - 1) * limit

    let query = directSupabaseClient.from('profiles').select('*', { count: 'exact' })

    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim()
      query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%,phone_number.ilike.%${s}%,nickname.ilike.%${s}%`)
    }

    if (filters.role && filters.role !== 'ALL') {
      query = query.eq('role', filters.role)
    }

    if (filters.status && filters.status !== 'ALL') {
      query = query.eq('status', filters.status)
    }

    query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      throw new Error(`Lỗi truy vấn trực tiếp Supabase: ${error.message}`)
    }

    const items: UserProfile[] = (data || []).map((row: any) => ({
      id: String(row.id),
      email: String(row.email || ''),
      password_hash: String(row.password_hash || ''),
      full_name: String(row.full_name || ''),
      nickname: row.nickname ? String(row.nickname) : null,
      phone_number: row.phone_number ? String(row.phone_number) : (row.phone ? String(row.phone) : null),
      role: (String(row.role || 'STUDENT').toUpperCase()) as UserRole,
      avatar_url: row.avatar_url ? String(row.avatar_url) : null,
      status: (String(row.status || 'active').toLowerCase()) as UserStatus,
      is_verified: Boolean(row.is_verified || (String(row.role || '').toUpperCase() === 'TEACHER')),
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString(),
    }))

    const total = count ?? items.length

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      source: 'supabase',
    }
  },

  /**
   * Create new user in Supabase via backend API
   */
  async createUser(
    input: CreateUserInput,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<UserProfile> {
    const response = await authenticatedFetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(input),
    }, accessToken, refreshAccessToken)

    const json: ApiResponse<UserProfile> = await response.json()
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Lỗi khởi tạo tài khoản trên Supabase')
    }

    return json.data!
  },

  /**
   * Update status (lock / unlock) in Supabase
   */
  async updateStatus(
    id: string,
    status: UserStatus,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<UserProfile> {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ status }),
    }, accessToken, refreshAccessToken)

    const json: ApiResponse<UserProfile> = await response.json()
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Lỗi cập nhật trạng thái người dùng trên Supabase')
    }

    return json.data!
  },

  /**
   * Delete user from Supabase
   */
  async deleteUser(
    id: string,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<void> {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(accessToken),
    }, accessToken, refreshAccessToken)

    const json: ApiResponse = await response.json()
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Lỗi xóa người dùng khỏi Supabase')
    }
  },

  /**
   * Seed sample data into empty Supabase profiles table
   */
  async seedSupabase(
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<{ inserted: number; message: string }> {
    const response = await authenticatedFetch(`${API_BASE_URL}/users/seed`, {
      method: 'POST',
      headers: authHeaders(accessToken),
    }, accessToken, refreshAccessToken)

    const json = await response.json()
    if (!response.ok || !json.success) {
      throw new Error(json.message || 'Lỗi seed dữ liệu Supabase')
    }

    return json.data || { inserted: 0, message: json.message }
  },

  /**
   * Export CSV file
   */
  async exportCsv(
    filters: Partial<UserFilterState>,
    accessToken: string | null,
    refreshAccessToken: () => Promise<string>
  ): Promise<void> {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.role && filters.role !== 'ALL') params.append('role', filters.role)
    if (filters.status && filters.status !== 'ALL') params.append('status', filters.status)

    const response = await authenticatedFetch(`${API_BASE_URL}/users/export?${params.toString()}`, {
      headers: authHeaders(accessToken),
    }, accessToken, refreshAccessToken)
    if (!response.ok) {
      throw new Error('Lỗi xuất file CSV từ Supabase')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `engmaster_users_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

export interface AuthUser {
  id: string
  email: string
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
}

export interface AuthSession {
  accessToken: string
  user: AuthUser
}

export interface ForgotPasswordResponse {
  message: string
  resetUrl?: string
}

export class AuthApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'AuthApiError'
  }
}

async function request<T>(
  path: string,
  body?: Record<string, string>,
  accessToken?: string
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/auth${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      credentials: 'include',
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    throw new AuthApiError(
      error instanceof Error
        ? `Không thể kết nối máy chủ xác thực: ${error.message}`
        : 'Không thể kết nối máy chủ xác thực.',
      0
    )
  }

  if (response.status === 204) return undefined as T

  const responseText = await response.text()
  let result: unknown
  try {
    result = responseText ? JSON.parse(responseText) : {}
  } catch {
    throw new AuthApiError('Máy chủ trả về dữ liệu không hợp lệ.', response.status)
  }

  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'message' in result &&
      typeof result.message === 'string'
        ? result.message
        : `Yêu cầu thất bại (HTTP ${response.status}).`
    throw new AuthApiError(message, response.status)
  }

  return result as T
}

function tokenSession(result: unknown): AuthSession {
  if (!result || typeof result !== 'object' || !('data' in result)) {
    throw new AuthApiError('Phản hồi xác thực không đúng định dạng.', 502)
  }
  const data = result.data
  if (
    !data || typeof data !== 'object' ||
    !('accessToken' in data) || typeof data.accessToken !== 'string' ||
    !('user' in data) || !data.user || typeof data.user !== 'object'
  ) {
    throw new AuthApiError('Phản hồi xác thực không đúng định dạng.', 502)
  }

  const user = data.user
  if (
    !('id' in user) || typeof user.id !== 'string' ||
    !('email' in user) || typeof user.email !== 'string' ||
    !('role' in user) ||
    (user.role !== 'STUDENT' && user.role !== 'TEACHER' && user.role !== 'ADMIN')
  ) {
    throw new AuthApiError('Thông tin tài khoản trong phản hồi không hợp lệ.', 502)
  }

  return {
    accessToken: data.accessToken,
    user: { id: user.id, email: user.email, role: user.role },
  }
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/login', { email, password }))
  },

  async register(email: string, password: string, confirmPassword: string): Promise<AuthSession> {
    return tokenSession(
      await request<unknown>('/register', { email, password, confirmPassword })
    )
  },

  async refresh(): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/refresh', {}))
  },

  async logout(accessToken?: string): Promise<void> {
    await request<void>('/logout', {}, accessToken)
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const result = await request<unknown>('/forgot-password', { email })
    if (
      !result || typeof result !== 'object' ||
      !('message' in result) || typeof result.message !== 'string'
    ) {
      throw new AuthApiError('Phản hồi khôi phục mật khẩu không đúng định dạng.', 502)
    }
    return {
      message: result.message,
      ...('resetUrl' in result && typeof result.resetUrl === 'string'
        ? { resetUrl: result.resetUrl }
        : {}),
    }
  },

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<void> {
    await request<void>('/reset-password', { token, newPassword, confirmPassword })
  },
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
}

export function getAuthApiErrorStatus(error: unknown): number | undefined {
  return error instanceof AuthApiError ? error.status : undefined
}

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

export function startGoogleOAuth(): void {
  window.location.assign(`${API_BASE_URL}/auth/google`)
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  phoneNumber: string | null
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
}

export interface AuthSession {
  accessToken: string
  user: AuthUser
}

export interface GoogleIdentity {
  email: string
  fullName: string
  avatarUrl: string | null
}

export interface ForgotPasswordResponse {
  message: string
}

export interface RegistrationResult {
  verificationRequired: true
  email: string
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
  body?: Record<string, unknown>,
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
    const isNetworkFetchError =
      error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')
    throw new AuthApiError(
      isNetworkFetchError
        ? 'Không thể kết nối máy chủ xác thực (port 5000). Vui lòng đảm bảo backend đang chạy (cd backend; npm run dev).'
        : error instanceof Error
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
    ('full_name' in user && typeof user.full_name !== 'string') ||
    ('phone_number' in user && user.phone_number !== null && typeof user.phone_number !== 'string') ||
    !('role' in user) ||
    (user.role !== 'STUDENT' && user.role !== 'TEACHER' && user.role !== 'ADMIN')
  ) {
    throw new AuthApiError('Thông tin tài khoản trong phản hồi không hợp lệ.', 502)
  }

  return {
    accessToken: data.accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: 'full_name' in user && typeof user.full_name === 'string' ? user.full_name : '',
      phoneNumber: 'phone_number' in user && typeof user.phone_number === 'string'
        ? user.phone_number
        : null,
      role: user.role,
    },
  }
}

export const authApi = {
  async login(email: string, password: string, rememberMe: boolean): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/login', { email, password, rememberMe }))
  },

  async loginWithGoogle(payload: {
    credential?: string
    idToken?: string
    accessToken?: string
    supabaseToken?: string
    developmentDemoUser?: { email: string; name: string }
  }): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/google', payload))
  },

  async googleIdentity(payload: {
    credential?: string
    idToken?: string
    accessToken?: string
    supabaseToken?: string
    developmentDemoUser?: { email: string; name: string }
  }): Promise<GoogleIdentity> {
    const result = await request<unknown>('/google/identity', payload)
    if (
      !result || typeof result !== 'object' ||
      !('data' in result) || !result.data || typeof result.data !== 'object' ||
      !('email' in result.data) || typeof result.data.email !== 'string' ||
      !('fullName' in result.data) || typeof result.data.fullName !== 'string' ||
      !('avatarUrl' in result.data) ||
      (result.data.avatarUrl !== null && typeof result.data.avatarUrl !== 'string')
    ) {
      throw new AuthApiError('Thông tin tài khoản Google trả về không hợp lệ.', 502)
    }

    return {
      email: result.data.email,
      fullName: result.data.fullName,
      avatarUrl: result.data.avatarUrl,
    }
  },

  async register(
    fullName: string,
    dateOfBirth: string,
    email: string,
    phoneNumber: string,
    password: string,
    confirmPassword: string,
    selectedCourseIds?: string[]
  ): Promise<RegistrationResult> {
    const result = await request<unknown>('/register', {
      fullName,
      dateOfBirth,
      email,
      phoneNumber,
      password,
      confirmPassword,
      ...(selectedCourseIds && selectedCourseIds.length > 0 ? { selectedCourseIds } : {}),
    })
    if (
      !result || typeof result !== 'object' ||
      !('data' in result) || !result.data || typeof result.data !== 'object' ||
      !('verificationRequired' in result.data) || result.data.verificationRequired !== true ||
      !('email' in result.data) || typeof result.data.email !== 'string'
    ) {
      throw new AuthApiError('Phản hồi đăng ký không đúng định dạng.', 502)
    }
    return { verificationRequired: true, email: result.data.email }
  },

  async requestRegistrationOtp(email: string): Promise<{
    developmentOtp?: string
    developmentEmailFallback?: boolean
  }> {
    const result = await request<unknown>('/register/verification/resend', { email })
    if (
      !result || typeof result !== 'object' ||
      !('message' in result) || typeof result.message !== 'string'
    ) {
      throw new AuthApiError('Phản hồi xác minh email không đúng định dạng.', 502)
    }
    const developmentOtp = 'developmentOtp' in result ? result.developmentOtp : undefined
    let developmentEmailFallback = false
    if ('developmentEmailFallback' in result) {
      if (typeof result.developmentEmailFallback !== 'boolean') {
        throw new AuthApiError('Phản hồi gửi email xác minh không hợp lệ.', 502)
      }
      developmentEmailFallback = result.developmentEmailFallback
    }
    if (
      developmentOtp !== undefined &&
      (typeof developmentOtp !== 'string' || !/^\d{6}$/.test(developmentOtp))
    ) {
      throw new AuthApiError('Mã xác minh thử nghiệm không hợp lệ.', 502)
    }
    if (developmentEmailFallback && typeof developmentOtp !== 'string') {
      throw new AuthApiError('Phản hồi gửi email xác minh không hợp lệ.', 502)
    }
    return {
      ...(typeof developmentOtp === 'string' ? { developmentOtp } : {}),
      ...(developmentEmailFallback ? { developmentEmailFallback: true } : {}),
    }
  },

  async verifyRegistrationOtp(email: string, otp: string): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/register/verification/verify', { email, otp }))
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
    return { message: result.message }
  },
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
}

export function getAuthApiErrorStatus(error: unknown): number | undefined {
  return error instanceof AuthApiError ? error.status : undefined
}

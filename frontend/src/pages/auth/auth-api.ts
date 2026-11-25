import { translateErrorMessageToVietnamese } from './vietnamese-messages'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:5000/api'
).replace(/\/+$/, '')

export function startGoogleOAuth(): void {
  const paymentOrderId = new URLSearchParams(window.location.search).get('paymentOrderId')
  if (paymentOrderId && /^[0-9a-f-]{36}$/i.test(paymentOrderId)) {
    try { sessionStorage.setItem('your-voice-pending-payment-order-id', paymentOrderId) } catch { /* Optional redirect context. */ }
  }
  window.location.assign(`${API_BASE_URL}/auth/google`)
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  nickname: string | null
  phoneNumber: string | null
  avatarUrl: string | null
  role: 'STUDENT' | 'TEACHER' | 'ADMIN'
  status: 'active' | 'locked' | 'pending' | 'deactivated'
  isVerified: boolean
}

export interface AuthSession {
  accessToken: string
  user: AuthUser
}

export interface GoogleIdentity {
  email: string
  fullName: string
  avatarUrl: string | null
  phoneNumber: string | null
  dateOfBirth: string | null
}

export interface ForgotPasswordResponse {
  message: string
}

export interface SavedRegistrationDetails {
  fullName: string
  dateOfBirth: string | null
  phoneNumber: string | null
  selectedCourseIds: string[]
}

export interface RegistrationResult {
  verificationRequired: boolean
  email: string
  selectedCourseIds?: string[]
  reusedExistingAccount?: boolean
  savedRegistration?: SavedRegistrationDetails
}

export class AuthApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'AuthApiError'
  }
}

async function request<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  return requestApi<T>(`/auth${path}`, body, accessToken)
}

async function requestApi<T>(
  path: string,
  body?: Record<string, unknown>,
  accessToken?: string
): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (body) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      credentials: 'include',
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    throw new AuthApiError(
      error instanceof TypeError
        ? 'Không thể kết nối máy chủ xác thực. Hãy kiểm tra kết nối mạng và cấu hình API của website.'
        : error instanceof Error
          ? `Không thể gửi yêu cầu xác thực: ${error.message}`
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
    const rawMessage =
      result && typeof result === 'object' && 'message' in result &&
      typeof result.message === 'string'
        ? result.message
        : ''
    const message = translateErrorMessageToVietnamese(
      rawMessage,
      `Yêu cầu thất bại (HTTP ${response.status}).`
    )
    const code = result && typeof result === 'object' && 'code' in result && typeof result.code === 'string'
      ? result.code
      : undefined
    throw new AuthApiError(message, response.status, code)
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
    !('full_name' in user) || typeof user.full_name !== 'string' ||
    !('nickname' in user) || (user.nickname !== null && typeof user.nickname !== 'string') ||
    !('phone_number' in user) || (user.phone_number !== null && typeof user.phone_number !== 'string') ||
    !('avatar_url' in user) ||
    (user.avatar_url !== null && typeof user.avatar_url !== 'string') ||
    !('role' in user) ||
    (user.role !== 'STUDENT' && user.role !== 'TEACHER' && user.role !== 'ADMIN') ||
    !('status' in user) ||
    (user.status !== 'active' && user.status !== 'locked' && user.status !== 'pending' && user.status !== 'deactivated') ||
    !('is_verified' in user) || typeof user.is_verified !== 'boolean'
  ) {
    throw new AuthApiError('Thông tin tài khoản trong phản hồi không hợp lệ.', 502)
  }

  // Prevent a response from pairing one profile with another user's access token.
  try {
    const payload = data.accessToken.split('.')[1]
    if (!payload) throw new Error('Missing token claims')
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))) as { sub?: unknown }
    if (claims.sub !== user.id) throw new Error('Token subject does not match profile id')
  } catch {
    throw new AuthApiError('Thông tin tài khoản không khớp với phiên đăng nhập.', 502)
  }

  return {
    accessToken: data.accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      nickname: user.nickname,
      phoneNumber: user.phone_number,
      avatarUrl: 'avatar_url' in user && typeof user.avatar_url === 'string' && user.avatar_url.trim()
        ? user.avatar_url.trim()
        : null,
      role: user.role,
      status: user.status,
      isVerified: user.is_verified,
    },
  }
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/login', { email, password, rememberMe: false }))
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

  async completeGoogleLogin(token?: string): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/google/session', token ? { accessToken: token } : {}))
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
      (result.data.avatarUrl !== null && typeof result.data.avatarUrl !== 'string') ||
      !('phoneNumber' in result.data) ||
      (result.data.phoneNumber !== null && typeof result.data.phoneNumber !== 'string') ||
      !('dateOfBirth' in result.data) ||
      (result.data.dateOfBirth !== null && typeof result.data.dateOfBirth !== 'string')
    ) {
      throw new AuthApiError('Thông tin tài khoản Google trả về không hợp lệ.', 502)
    }

    return {
      email: result.data.email,
      fullName: result.data.fullName,
      avatarUrl: result.data.avatarUrl,
      phoneNumber: result.data.phoneNumber,
      dateOfBirth: result.data.dateOfBirth,
    }
  },

  async register(
    fullName: string,
    dateOfBirth: string,
    email: string,
    phoneNumber: string,
    password: string,
    confirmPassword: string,
    selectedCourseIds?: string[],
    googleAccessToken?: string
  ): Promise<RegistrationResult> {
    const result = await request<unknown>('/register', {
      fullName,
      dateOfBirth,
      email,
      phoneNumber,
      password,
      confirmPassword,
      ...(googleAccessToken ? { googleAccessToken } : {}),
      ...(selectedCourseIds && selectedCourseIds.length > 0 ? { selectedCourseIds } : {}),
    })
    if (
      !result || typeof result !== 'object' ||
      !('data' in result) || !result.data || typeof result.data !== 'object' ||
      !('verificationRequired' in result.data) || typeof result.data.verificationRequired !== 'boolean' ||
      !('email' in result.data) || typeof result.data.email !== 'string'
    ) {
      throw new AuthApiError('Phản hồi đăng ký không đúng định dạng.', 502)
    }
    const data = result.data as Record<string, unknown>
    const returnedCourseIds = Array.isArray(data.selectedCourseIds)
      ? data.selectedCourseIds.filter((item): item is string => typeof item === 'string')
      : undefined
    const reusedExistingAccount = typeof data.reusedExistingAccount === 'boolean'
      ? data.reusedExistingAccount
      : undefined
    const rawSaved = data.savedRegistration && typeof data.savedRegistration === 'object'
      ? data.savedRegistration as Record<string, unknown>
      : null
    const savedRegistration: SavedRegistrationDetails | undefined = rawSaved && typeof rawSaved.fullName === 'string'
      ? {
          fullName: rawSaved.fullName,
          dateOfBirth: typeof rawSaved.dateOfBirth === 'string' ? rawSaved.dateOfBirth : null,
          phoneNumber: typeof rawSaved.phoneNumber === 'string' ? rawSaved.phoneNumber : null,
          selectedCourseIds: Array.isArray(rawSaved.selectedCourseIds)
            ? rawSaved.selectedCourseIds.filter((item): item is string => typeof item === 'string')
            : [],
        }
      : undefined
    return {
      verificationRequired: data.verificationRequired as boolean,
      email: data.email as string,
      ...(returnedCourseIds ? { selectedCourseIds: returnedCourseIds } : {}),
      ...(reusedExistingAccount !== undefined ? { reusedExistingAccount } : {}),
      ...(savedRegistration ? { savedRegistration } : {}),
    }
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

  async verifyRegistrationOtp(email: string, otp: string): Promise<void> {
    const result = await request<unknown>('/register/verification/verify', { email, otp })
    if (
      !result || typeof result !== 'object' || !('success' in result) || result.success !== true ||
      !('data' in result) || !result.data || typeof result.data !== 'object' ||
      !('verified' in result.data) || result.data.verified !== true
    ) {
      throw new AuthApiError('Phản hồi xác minh đăng ký không hợp lệ.', 502)
    }
  },

  async refresh(): Promise<AuthSession> {
    return tokenSession(await request<unknown>('/refresh', {}))
  },

  async me(accessToken?: string): Promise<AuthUser> {
    const result = await request<unknown>('/me', undefined, accessToken)
    if (!result || typeof result !== 'object' || !('data' in result) || !result.data || typeof result.data !== 'object') {
      throw new AuthApiError('Phản hồi /me không đúng định dạng.', 502)
    }
    const user = (result as { data: Record<string, unknown> }).data
    return {
      id: String(user.id),
      email: String(user.email),
      fullName: String(user.full_name),
      nickname: user.nickname ? String(user.nickname) : null,
      phoneNumber: user.phone_number ? String(user.phone_number) : null,
      avatarUrl: typeof user.avatar_url === 'string' && user.avatar_url.trim()
        ? user.avatar_url.trim()
        : null,
      role: user.role as AuthUser['role'],
      status: user.status as AuthUser['status'],
      isVerified: Boolean(user.is_verified),
    }
  },

  async logout(accessToken?: string): Promise<void> {
    await request<void>('/logout', {}, accessToken)
  },

  async changePassword(currentPassword: string, newPassword: string, accessToken?: string): Promise<void> {
    await request<void>('/change-password', { currentPassword, newPassword }, accessToken)
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
      message: translateErrorMessageToVietnamese(
        result.message,
        'Nếu tài khoản đã được đăng ký, hướng dẫn khôi phục đã được gửi đến email.'
      ),
    }
  },

  async activateTeacher(token: string, password: string): Promise<void> {
    await requestApi('/teachers/activation/complete', { token, password })
  },

  async requestTeacherPasswordReset(email: string): Promise<void> {
    await requestApi('/teachers/password-reset/request', { email })
  },

  async resetTeacherPassword(token: string, password: string): Promise<void> {
    await requestApi('/teachers/password-reset/complete', { token, password })
  },
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? translateErrorMessageToVietnamese(error.message, 'Đã xảy ra lỗi không xác định.')
    : 'Đã xảy ra lỗi không xác định.'
}

export function getAuthApiErrorStatus(error: unknown): number | undefined {
  return error instanceof AuthApiError ? error.status : undefined
}

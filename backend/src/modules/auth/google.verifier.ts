import { env } from '../../config/env.js'
import { createSupabaseClient } from '../../config/supabase.js'
import { AuthError } from './auth.errors.js'
import type { GoogleAuthInput, GoogleUserInfo } from './google.types.js'

interface GoogleTokenInfoResponse {
  iss?: string
  sub?: string
  azp?: string
  aud?: string
  email?: string
  email_verified?: string | boolean
  name?: string
  picture?: string
  error?: string
  error_description?: string
}

interface GoogleUserInfoResponse {
  sub?: string
  name?: string
  email?: string
  email_verified?: boolean
  picture?: string
  error?: {
    message?: string
  }
}

export async function verifyGoogleAuthInput(
  input: GoogleAuthInput,
  expectedClientId = env.googleClientId
): Promise<GoogleUserInfo> {
  const token = (input.credential ?? input.idToken)?.trim()

  if (token) {
    return verifyGoogleIdToken(token, expectedClientId)
  }

  if (input.accessToken?.trim()) {
    return verifyGoogleAccessToken(input.accessToken.trim())
  }

  if (input.supabaseToken?.trim()) {
    return verifySupabaseToken(input.supabaseToken.trim())
  }

  if (env.nodeEnv === 'development' && input.developmentDemoUser) {
    const demo = input.developmentDemoUser
    if (!demo.email || !demo.email.includes('@')) {
      throw new AuthError('Email thử nghiệm Google không hợp lệ.', 400)
    }
    return {
      email: demo.email.toLowerCase().trim(),
      name: demo.name.trim() || demo.email.split('@')[0] || 'Google User',
      avatarUrl: demo.avatarUrl?.trim() || null,
      emailVerified: true,
      googleId: `dev-google-${demo.email.toLowerCase().trim()}`,
    }
  }

  throw new AuthError('Vui lòng cung cấp mã thông thực Google (credential hoặc idToken).', 400)
}

async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId?: string
): Promise<GoogleUserInfo> {
  let response: Response
  try {
    response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
    )
  } catch (error) {
    throw new AuthError('Không thể kết nối máy chủ Google để xác thực.', 503, error)
  }

  let payload: GoogleTokenInfoResponse
  try {
    payload = (await response.json()) as GoogleTokenInfoResponse
  } catch {
    throw new AuthError('Máy chủ Google trả về định dạng không hợp lệ.', 502)
  }

  if (!response.ok || payload.error) {
    throw new AuthError(
      payload.error_description || 'Mã xác thực Google không hợp lệ hoặc đã hết hạn.',
      401
    )
  }

  const validIssuer =
    payload.iss === 'accounts.google.com' || payload.iss === 'https://accounts.google.com'
  if (!validIssuer) {
    throw new AuthError('Mã xác thực Google không xuất phát từ nguồn đáng tin cậy.', 401)
  }

  if (expectedClientId && payload.aud !== expectedClientId) {
    throw new AuthError('Mã xác thực Google không dành cho ứng dụng này.', 401)
  }

  if (!payload.email) {
    throw new AuthError('Tài khoản Google không cung cấp địa chỉ email.', 400)
  }

  const isVerified = payload.email_verified === true || payload.email_verified === 'true'
  if (!isVerified) {
    throw new AuthError('Địa chỉ email Google chưa được xác minh.', 400)
  }

  return {
    email: payload.email.toLowerCase().trim(),
    name: payload.name?.trim() || payload.email.split('@')[0] || 'Google User',
    avatarUrl: payload.picture?.trim() || null,
    emailVerified: true,
    googleId: payload.sub || payload.email,
  }
}

async function verifyGoogleAccessToken(accessToken: string): Promise<GoogleUserInfo> {
  let response: Response
  try {
    response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch (error) {
    throw new AuthError('Không thể kết nối máy chủ Google để xác thực.', 503, error)
  }

  let payload: GoogleUserInfoResponse
  try {
    payload = (await response.json()) as GoogleUserInfoResponse
  } catch {
    throw new AuthError('Máy chủ Google trả về định dạng không hợp lệ.', 502)
  }

  if (!response.ok || !payload.email) {
    throw new AuthError(payload.error?.message || 'Access token Google không hợp lệ.', 401)
  }

  return {
    email: payload.email.toLowerCase().trim(),
    name: payload.name?.trim() || payload.email.split('@')[0] || 'Google User',
    avatarUrl: payload.picture?.trim() || null,
    emailVerified: payload.email_verified === true,
    googleId: payload.sub || payload.email,
  }
}

async function verifySupabaseToken(supabaseToken: string): Promise<GoogleUserInfo> {
  const supabase = createSupabaseClient()
  const { data, error } = await supabase.auth.getUser(supabaseToken)

  if (error || !data.user || !data.user.email) {
    throw new AuthError(
      error?.message || 'Không thể xác thực thông tin tài khoản Supabase Google.',
      401
    )
  }

  const metadata = data.user.user_metadata as Record<string, unknown> | undefined
  const fullName =
    typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : typeof metadata?.name === 'string'
        ? metadata.name
        : data.user.email.split('@')[0] || 'Google User'

  const avatarUrl =
    typeof metadata?.avatar_url === 'string'
      ? metadata.avatar_url
      : typeof metadata?.picture === 'string'
        ? metadata.picture
        : null

  return {
    email: data.user.email.toLowerCase().trim(),
    name: fullName.trim(),
    avatarUrl: avatarUrl?.trim() || null,
    emailVerified: true,
    googleId: data.user.id,
  }
}

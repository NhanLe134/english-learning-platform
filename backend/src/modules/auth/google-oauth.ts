import { env } from '../../config/env.js'
import { AuthError } from './auth.errors.js'

function googleRedirectUri(): string {
  return new URL('/api/auth/google/callback', env.apiOrigin).toString()
}

function assertGoogleOAuthConfigured(): void {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new AuthError('Google OAuth is not configured on the server.', 503)
  }
}

export function createGoogleAuthorizationUrl(state: string): string {
  assertGoogleOAuthConfigured()
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authorizationUrl.search = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  }).toString()
  return authorizationUrl.toString()
}

export async function exchangeGoogleAuthorizationCode(code: string): Promise<string> {
  assertGoogleOAuthConfigured()

  let response: Response
  try {
    response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: env.googleClientSecret,
        redirect_uri: googleRedirectUri(),
        grant_type: 'authorization_code',
      }),
    })
  } catch (error) {
    throw new AuthError('Không thể kết nối Google để xác thực.', 503, error)
  }

  let payload: { access_token?: unknown; error_description?: unknown }
  try {
    payload = (await response.json()) as typeof payload
  } catch (error) {
    throw new AuthError('Google trả về phản hồi không hợp lệ khi đổi mã xác thực.', 502, error)
  }

  if (!response.ok || typeof payload.access_token !== 'string') {
    const description =
      typeof payload.error_description === 'string' ? payload.error_description : undefined
    throw new AuthError(description || 'Google từ chối mã xác thực.', 401)
  }

  return payload.access_token
}

import { createClient } from '@supabase/supabase-js'
import { authApi, startGoogleOAuth, type AuthSession } from './auth-api'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          prompt: (notification?: (notification: unknown) => void) => void
          renderButton: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void
        }
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: {
              access_token?: string
              error?: string
              error_description?: string
            }) => void
            prompt?: string
          }) => {
            requestAccessToken: () => void
          }
        }
      }
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null

function loadGoogleScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Không thể tải Google Identity Services.')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('Không thể tải thư viện Google Identity Services. Vui lòng kiểm tra kết nối mạng.'))
    }
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID || (SUPABASE_URL && SUPABASE_ANON_KEY))
}

export interface GoogleAuthOptions {
  onSuccess: (session: AuthSession) => void
  onError: (errorMessage: string) => void
  onLoading?: (isLoading: boolean) => void
}

export interface GoogleProfile {
  email: string
  fullName: string
  avatarUrl: string | null
  phoneNumber: string | null
  dateOfBirth: string | null
  accessToken: string
}

export interface GoogleRegistrationOptions {
  onSuccess: (profile: GoogleProfile) => void
  onError: (errorMessage: string) => void
  onLoading?: (isLoading: boolean) => void
}

export async function initiateGoogleRegistration({
  onSuccess,
  onError,
  onLoading,
}: GoogleRegistrationOptions): Promise<void> {
  onLoading?.(true)

  if (GOOGLE_CLIENT_ID) {
    try {
      await loadGoogleScript()
      if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity Services chưa sẵn sàng.')
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile https://www.googleapis.com/auth/user.phonenumbers.read https://www.googleapis.com/auth/user.birthday.read',
        prompt: 'select_account',
        callback: async (response) => {
          if (response.error || !response.access_token) {
            onLoading?.(false)
            if (response.error !== 'popup_closed_by_user') {
              onError(response.error_description || 'Đăng nhập Google không thành công.')
            }
            return
          }

          try {
            const profile = await authApi.googleIdentity({
              accessToken: response.access_token,
            })
            onSuccess({ ...profile, accessToken: response.access_token })
          } catch (error) {
            onError(error instanceof Error ? error.message : 'Không thể xác thực tài khoản Google.')
          } finally {
            onLoading?.(false)
          }
        },
      })

      client.requestAccessToken()
      return
    } catch (error) {
      onLoading?.(false)
      onError(error instanceof Error ? error.message : 'Không thể khởi động đăng nhập Google.')
      return
    }
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      const returnTo = `/register${window.location.search}`
      const redirectUrl = `${window.location.origin}/auth/callback?flow=register&returnTo=${encodeURIComponent(returnTo)}`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })

      if (error) throw error
      if (data?.url) {
        window.location.assign(data.url)
        return
      }
      throw new Error('Không thể bắt đầu đăng ký bằng Google.')
    } catch (error) {
      onLoading?.(false)
      onError(error instanceof Error ? error.message : 'Không thể khởi động đăng ký Google.')
      return
    }
  }

  onLoading?.(false)
  if (import.meta.env.DEV) {
    const demoEmail = window.prompt(
      'Môi trường phát triển: nhập email Google demo để điền trước biểu mẫu đăng ký.',
      'student.google@gmail.com'
    )
    if (demoEmail === null) return
    const email = demoEmail.trim() || 'student.google@gmail.com'
    onLoading?.(true)
    try {
      const profile = await authApi.googleIdentity({
        developmentDemoUser: {
          email,
          name: email.split('@')[0] || 'Google Learner',
        },
      })
      onSuccess({ ...profile, accessToken: '', phoneNumber: null, dateOfBirth: null })
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Không thể xác thực tài khoản Google.')
    } finally {
      onLoading?.(false)
    }
    return
  }

  onError(
    'Chưa cấu hình Google Client ID. Vui lòng thêm VITE_GOOGLE_CLIENT_ID vào frontend/.env hoặc bật Google Provider trong Supabase Dashboard.'
  )
}

export async function initiateGoogleSignIn({
  onError,
  onLoading,
}: GoogleAuthOptions): Promise<void> {
  onLoading?.(true)
  try {
    startGoogleOAuth()
  } catch (error) {
    onLoading?.(false)
    onError(error instanceof Error ? error.message : 'Không thể khởi động đăng nhập Google.')
  }
}

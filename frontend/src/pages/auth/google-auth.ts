import { createClient } from '@supabase/supabase-js'
import { authApi, getErrorMessage, startGoogleOAuth, type AuthSession } from './auth-api'
import { translateErrorMessageToVietnamese } from './vietnamese-messages'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const GOOGLE_POPUP_TIMEOUT_MS = 2 * 60 * 1000

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
            error_callback?: (error: {
              type?: 'popup_closed' | 'popup_failed_to_open' | 'unknown' | string
              message?: string
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
      existing.addEventListener('error', () => reject(new Error('Không thể tải dịch vụ đăng nhập Google.')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('Không thể tải dịch vụ đăng nhập Google. Vui lòng kiểm tra kết nối mạng.'))
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
        throw new Error('Dịch vụ đăng nhập Google chưa sẵn sàng.')
      }

      let settled = false
      const timeoutId = window.setTimeout(() => {
        if (settled) return
        settled = true
        onLoading?.(false)
      }, GOOGLE_POPUP_TIMEOUT_MS)

      const finishPendingPopup = () => {
        if (settled) return false
        settled = true
        window.clearTimeout(timeoutId)
        return true
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'openid email profile https://www.googleapis.com/auth/user.phonenumbers.read https://www.googleapis.com/auth/user.birthday.read',
        prompt: 'select_account',
        error_callback: (error) => {
          if (!finishPendingPopup()) return
          onLoading?.(false)
          if (error.type === 'popup_closed') {
            return
          }
          if (error.type === 'popup_failed_to_open') {
            onError('Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép cửa sổ bật lên và thử lại.')
            return
          }
          onError(
            translateErrorMessageToVietnamese(
              error.message,
              'Đăng nhập Google không thành công.'
            )
          )
        },
        callback: async (response) => {
          if (!finishPendingPopup()) return
          if (response.error || !response.access_token) {
            onLoading?.(false)
            if (response.error !== 'popup_closed_by_user' && response.error !== 'access_denied') {
              onError(
                translateErrorMessageToVietnamese(
                  response.error_description,
                  'Đăng nhập Google không thành công.'
                )
              )
            }
            return
          }

          try {
            const profile = await authApi.googleIdentity({
              accessToken: response.access_token,
            })
            onSuccess({ ...profile, accessToken: response.access_token })
          } catch (error) {
            onError(getErrorMessage(error))
          } finally {
            onLoading?.(false)
          }
        },
      })

      try {
        client.requestAccessToken()
      } catch (requestError) {
        if (finishPendingPopup()) {
          onLoading?.(false)
        }
        throw requestError
      }
      return
    } catch (error) {
      onLoading?.(false)
      onError(getErrorMessage(error))
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
      onError(getErrorMessage(error))
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
          name: email.split('@')[0] || 'Học viên Google',
        },
      })
      onSuccess({ ...profile, accessToken: '', phoneNumber: null, dateOfBirth: null })
    } catch (error) {
      onError(getErrorMessage(error))
    } finally {
      onLoading?.(false)
    }
    return
  }

  onError(
    'Đăng nhập bằng Google hiện chưa được cấu hình. Vui lòng liên hệ quản trị viên.'
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
    onError(getErrorMessage(error))
  }
}

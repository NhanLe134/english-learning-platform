import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { authApi } from './auth-api'
import { useAuth } from './auth-context'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export function OAuthCallbackPage() {
  const { setSession, refreshSession } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const isRegistration = new URLSearchParams(window.location.search).get('flow') === 'register'

  useEffect(() => {
    let active = true

    async function handleCallback() {
      try {
        const provider = new URLSearchParams(window.location.search).get('provider')
        if (provider === 'google') {
          const appSession = await refreshSession()
          if (!active) return
          window.location.replace(
            appSession.user.role === 'ADMIN' ? '/admin/users' : `/checkout${window.location.search}`
          )
          return
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          throw new Error('Supabase chưa được cấu hình cho OAuth callback.')
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !data.session?.access_token) {
          throw new Error(sessionError?.message || 'Không tìm thấy phiên xác thực Google từ Supabase.')
        }

        if (isRegistration) {
          const profile = await authApi.googleIdentity({
            supabaseToken: data.session.access_token,
          })
          if (!active) return
          sessionStorage.setItem('google-registration-profile', JSON.stringify(profile))

          const requestedReturnTo = new URLSearchParams(window.location.search).get('returnTo')
          const returnUrl = requestedReturnTo?.startsWith('/register')
            ? new URL(requestedReturnTo, window.location.origin)
            : new URL('/register', window.location.origin)
          returnUrl.searchParams.set('googleProfile', '1')
          window.location.replace(`${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`)
          return
        }

        const appSession = await authApi.loginWithGoogle({
          supabaseToken: data.session.access_token,
        })

        if (!active) return
        setSession(appSession)

        if (appSession.user.role === 'ADMIN') {
          window.location.replace('/admin/users')
        } else {
          window.location.replace(`/checkout${window.location.search}`)
        }
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Xác thực Google thất bại.')
      }
    }

    void handleCallback()
    return () => {
      active = false
    }
  }, [isRegistration, refreshSession, setSession])

  if (error) {
    return (
      <main className="auth-route-status" role="alert" style={{ textAlign: 'center', padding: '48px 16px' }}>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
        <a href={isRegistration ? '/register' : '/login'} style={{ color: '#dc2626', textDecoration: 'underline' }}>
          {isRegistration ? 'Quay lại trang Đăng ký' : 'Quay lại trang Đăng nhập'}
        </a>
      </main>
    )
  }

  return (
    <main className="auth-route-status" role="status" style={{ textAlign: 'center', padding: '48px 16px' }}>
      {isRegistration ? 'Đang lấy thông tin từ Google…' : 'Đang hoàn tất đăng nhập bằng Google…'}
    </main>
  )
}

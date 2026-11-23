import { useEffect, useState, type FormEvent } from 'react'
import {
  BookOpen,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from 'lucide-react'
import { GoogleAuthButton, LoginVisual } from './AuthShared'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { useAuth } from './auth-context'
import { authApi, getErrorMessage } from './auth-api'
import { initiateGoogleSignIn } from './google-auth'
import { sepayApi } from '../checkout/sepayApi'
import './login-page.css'

const LOGOUT_HISTORY_LOCK_KEY = 'your-voice-logout-history-lock'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState(() =>
    new URLSearchParams(window.location.search).get('passwordReset') === 'sent'
      ? (window.location.pathname.startsWith('/teacher')
        ? 'Nếu tài khoản đang hoạt động, liên kết đặt lại mật khẩu đã được gửi đến email.'
        : 'Nếu tài khoản đã được đăng ký, hướng dẫn khôi phục đã được gửi đến email.')
      : ''
  )
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { setSession } = useAuth()

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LOGOUT_HISTORY_LOCK_KEY) !== '1') return
    } catch {
      return
    }

    const keepLoginPageAfterBack = () => {
      try {
        if (sessionStorage.getItem(LOGOUT_HISTORY_LOCK_KEY) !== '1') return
        if (window.location.pathname !== '/login') {
          window.history.replaceState(null, '', '/login')
        }
        window.history.pushState({ logoutHistoryLock: true }, '', '/login')
      } catch {
        // The logout and route guard still work if history state is unavailable.
      }
    }

    keepLoginPageAfterBack()
    window.addEventListener('popstate', keepLoginPageAfterBack)
    return () => {
      window.removeEventListener('popstate', keepLoginPageAfterBack)
      try { sessionStorage.removeItem(LOGOUT_HISTORY_LOCK_KEY) } catch { /* Optional browser history protection. */ }
    }
  }, [])

  async function handleAuthSuccess(session: import('./auth-api').AuthSession) {
    setSession(session)
    // Admin redirect
    if (session.user.role === 'ADMIN') {
      window.location.assign('/admin/dashboard')
      return
    }
    if (session.user.role === 'TEACHER') {
      window.location.assign('/teacher/dashboard')
      return
    }
    // Payment flow handling
    const paymentOrderId = new URLSearchParams(window.location.search).get('paymentOrderId')
    if (paymentOrderId) {
      try {
        const order = await sepayApi.getOrderStatus(paymentOrderId, session.accessToken)
        if (order.status !== 'paid' || !order.courseDetails?.slug) {
          throw new Error('Chưa tìm thấy giao dịch thanh toán thành công cho tài khoản này.')
        }
        if (order.enrollmentExists !== true) {
          window.location.assign(`/checkout/success?orderId=${encodeURIComponent(paymentOrderId)}`)
          return
        }
        window.location.assign(`/student/courses/${encodeURIComponent(order.courseDetails.slug)}`)
        return
      } catch (error) {
        setErrorMessage(getErrorMessage(error))
        return
      }
    }
    // Redirect param handling (checkout only) – resume only if a payment order is present
    const redirect = new URLSearchParams(window.location.search).get('redirect')
    if (paymentOrderId && redirect && redirect.startsWith('/checkout')) {
      window.location.assign(redirect)
      return
    }
    // Default student landing page
    window.location.assign('/my-courses')
  }

  async function handleGoogleLogin() {
    setErrorMessage('')
    setSuccessMessage('')
    await initiateGoogleSignIn({
      onSuccess: handleAuthSuccess,
      onError: (msg) => setErrorMessage(msg),
      onLoading: (loading) => setGoogleLoading(loading),
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      const session = await authApi.login(
        String(formData.get('email') ?? '').trim(),
        String(formData.get('password') ?? '')
      )
      await handleAuthSuccess(session)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <SiteHeader brandName="Your English Voice" />
      <main className="login-main-container">
        <div className="login-shell">
          <LoginVisual />

          <section className="login-form-panel" aria-labelledby="login-title">
          <div className="login-card">
            <div className="login-brand">
              <span className="login-brand-icon"><BookOpen size={22} strokeWidth={2.4} /></span>
              <span className="login-brand-name">
                <strong>Your English Voice</strong>
              </span>
            </div>
            <h1 id="login-title">Chào mừng trở lại!</h1>
            <p className="card-description">
              Đăng nhập để tiếp tục lộ trình học tập và mở khóa các bài học tiếng Anh chuẩn quốc tế.
            </p>

            <GoogleAuthButton
              onClick={() => void handleGoogleLogin()}
              disabled={submitting || googleLoading}
              loading={googleLoading}
            />
            <div className="login-divider"><span>Hoặc tiếp tục với</span></div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label htmlFor="email">EMAIL</label>
              <div className="input-wrap">
                <Mail size={15} aria-hidden="true" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="name@example.com"
                  required
                />
              </div>

              <label htmlFor="password">MẬT KHẨU</label>
              <div className="input-wrap">
                <LockKeyhole size={15} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {errorMessage && <p className="auth-feedback auth-feedback-error" role="alert">{errorMessage}</p>}
              {successMessage && <p className="auth-feedback auth-feedback-success" role="status">{successMessage}</p>}

              <div className="login-options">
              <a href={window.location.pathname.startsWith('/teacher') ? '/teacher/forgot-password' : '/forgot-password'}>Quên mật khẩu?</a>
              </div>

              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'ĐANG ĐĂNG NHẬP…' : 'ĐĂNG NHẬP'} <span aria-hidden="true">→</span>
              </button>
            </form>

            <p className="signup-prompt">
              Chưa có tài khoản? <a href="/courses">Đăng ký ngay</a>
            </p>

            <div className="login-security">
              <span><LockKeyhole size={12} /> MÃ HÓA SSL 256-BIT</span>
              <i aria-hidden="true">•</i>
              <span><ShieldCheck size={13} /> BẢO MẬT HỌC THUẬT</span>
            </div>
          </div>
        </section>
        </div>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import {
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from 'lucide-react'
import { AuthIntro, BrandMark, SiteHeader } from './AuthShared'
import { useAuth } from './auth-context'
import { authApi, getErrorMessage } from './auth-api'
import './login-page.css'

const EMAIL = 'elena.vance@oxfordlinguistics.edu'

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { setSession } = useAuth()

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
      setSession(session)
      if (session.user.role === 'ADMIN') {
        window.location.assign('/admin/users')
      } else {
        setSuccessMessage('Đăng nhập thành công. Khu vực học tập của tài khoản sẽ sớm được mở.')
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page min-h-screen bg-white">
      <SiteHeader />

      <main className="login-main">
        <AuthIntro />

        <section className="login-card" aria-labelledby="login-title">
          <div className="card-brand"><BrandMark small /></div>
          <h2 id="login-title">Chào Mừng Trở Lại</h2>
          <p className="card-description">
            Đăng nhập để tiếp tục hành trình nâng cao phản xạ tiếng Anh của bạn.
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label htmlFor="email">EMAIL <span>*</span></label>
            <div className="input-wrap">
              <Mail size={15} aria-hidden="true" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder={EMAIL}
                required
              />
            </div>

            <label htmlFor="password">MẬT KHẨU <span>*</span></label>
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

            <div className="form-options">
              <label className="remember-option" htmlFor="remember">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(event) => setRememberDevice(event.target.checked)}
                />
                <span className="custom-checkbox"><Check size={11} strokeWidth={3} /></span>
                Ghi nhớ đăng nhập trên thiết bị này
              </label>
              <a href="/forgot-password">Quên mật khẩu?</a>
            </div>

            <button type="submit" className="submit-button" disabled={submitting}>
              ĐĂNG NHẬP <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="signup-prompt">
            Chưa có tài khoản? <a href="/register">Đăng ký học thử ngay →</a>
          </p>
        </section>
      </main>

    </div>
  )
}

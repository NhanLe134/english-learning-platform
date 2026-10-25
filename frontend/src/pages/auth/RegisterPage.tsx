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
import './register-page.css'

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { setSession } = useAuth()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.')
      return
    }

    setSubmitting(true)
    try {
      const session = await authApi.register(
        String(formData.get('email') ?? '').trim(),
        password,
        confirmPassword
      )
      setSession(session)
      setSuccessMessage('Tạo tài khoản thành công. Bạn đã được đăng nhập.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page register-page min-h-screen bg-white">
      <SiteHeader />

      <main className="login-main register-main">
        <AuthIntro />

        <section className="register-card" aria-labelledby="register-title">
          <div className="card-brand"><BrandMark small /></div>
          <h2 id="register-title">Tạo Tài Khoản Mới</h2>
          <p className="card-description">
            Đăng ký chỉ mất 1 phút để mở khóa toàn bộ kho học liệu tương tác.
          </p>

          <form className="register-form" onSubmit={handleSubmit}>
            <label htmlFor="register-email">EMAIL <span>*</span></label>
            <div className="input-wrap">
              <Mail size={15} aria-hidden="true" />
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="elena.vance@oxfordlinguistics.edu"
                required
              />
            </div>

            <label htmlFor="register-password">MẬT KHẨU<span>*</span></label>
            <div className="input-wrap">
              <LockKeyhole size={15} aria-hidden="true" />
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••••"
                minLength={8}
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

            <label htmlFor="confirm-password">XÁC NHẬN MẬT KHẨU <span>*</span></label>
            <div className="input-wrap">
              <LockKeyhole size={15} aria-hidden="true" />
              <input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••••••"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((visible) => !visible)}
                aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label className="terms-option" htmlFor="accept-terms">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
              />
              <span className="custom-checkbox"><Check size={11} strokeWidth={3} /></span>
              <span className="terms-copy">
                Tôi đồng ý với <a href="#dieu-khoan">Điều khoản dịch vụ</a> và{' '}
                <a href="#chinh-sach-bao-mat">Chính sách bảo mật</a> của EngMaster.
              </span>
            </label>

            {errorMessage && <p className="auth-feedback auth-feedback-error" role="alert">{errorMessage}</p>}
            {successMessage && <p className="auth-feedback auth-feedback-success" role="status">{successMessage}</p>}

            <button type="submit" className="submit-button" disabled={submitting}>
              TẠO TÀI KHOẢN <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="signup-prompt">
            Đã có tài khoản? <a href="/login">Đăng nhập ngay →</a>
          </p>
        </section>
      </main>
    </div>
  )
}

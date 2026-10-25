import { useState, type FormEvent } from 'react'
import {
  Eye,
  EyeOff,
  LockKeyhole,
} from 'lucide-react'
import { AuthIntro, BrandMark, SiteHeader } from './AuthShared'
import { useAuth } from './auth-context'
import { authApi, getErrorMessage } from './auth-api'
import './login-page.css'
import './reset-password-page.css'

const PASSWORD_PLACEHOLDER = 'ElenaEng2025!@'

export function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState(
    new URLSearchParams(window.location.search).get('token')
      ? ''
      : 'Liên kết đặt lại mật khẩu không hợp lệ hoặc không có mã xác nhận.'
  )
  const [successMessage, setSuccessMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { clearSession } = useAuth()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setErrorMessage('Liên kết đặt lại mật khẩu không hợp lệ hoặc không có mã xác nhận.')
      return
    }

    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get('newPassword') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (newPassword !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.')
      return
    }

    setSubmitting(true)
    try {
      await authApi.resetPassword(token, newPassword, confirmPassword)
      clearSession()
      setSuccessMessage('Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page reset-password-page min-h-screen bg-white">
      <SiteHeader />

      <main className="login-main reset-password-main">
        <AuthIntro />

        <section className="reset-password-card" aria-labelledby="reset-password-title">
          <div className="card-brand"><BrandMark small /></div>
          <h2 id="reset-password-title">Tạo Mật Khẩu Mới</h2>
          <p className="reset-password-description">
            Vui lòng nhập mật khẩu mới mạnh mẽ và không trùng với mật khẩu cũ đã dùng trước đây.
          </p>

          <form className="reset-password-form" onSubmit={handleSubmit}>
            <label htmlFor="new-password">MẬT KHẨU MỚI <span>*</span></label>
            <div className="input-wrap">
              <LockKeyhole size={15} aria-hidden="true" />
              <input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={PASSWORD_PLACEHOLDER}
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="confirm-password-heading">
              <label htmlFor="confirm-new-password">XÁC NHẬN MẬT KHẨU <span>*</span></label>
            </div>
            <div className="input-wrap">
              <LockKeyhole size={15} aria-hidden="true" />
              <input
                id="confirm-new-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={PASSWORD_PLACEHOLDER}
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

            {errorMessage && <p className="auth-feedback auth-feedback-error" role="alert">{errorMessage}</p>}
            {successMessage && <p className="auth-feedback auth-feedback-success" role="status">{successMessage}</p>}

            <button
              type="submit"
              className="submit-button"
              disabled={submitting || !new URLSearchParams(window.location.search).get('token')}
            >
              CẬP NHẬT <span aria-hidden="true">→</span>
            </button>
          </form>

          <a className="reset-back-to-login" href="/login">← Quay lại Đăng Nhập</a>
          <p className="reset-support">
            Gặp sự cố khi đặt lại? <a href="#lien-he">Liên hệ hỗ trợ 24/7</a>
          </p>
        </section>
      </main>
    </div>
  )
}

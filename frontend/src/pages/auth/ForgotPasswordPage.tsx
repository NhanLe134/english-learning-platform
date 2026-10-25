import { useState, type FormEvent } from 'react'
import { Info, Mail } from 'lucide-react'
import { AuthIntro, BrandMark, SiteHeader } from './AuthShared'
import { authApi, getErrorMessage } from './auth-api'
import './login-page.css'
import './forgot-password-page.css'

const EMAIL_PLACEHOLDER = 'elena.vance@oxfordlinguistics.edu'

export function ForgotPasswordPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setResetUrl('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      const result = await authApi.forgotPassword(
        String(formData.get('email') ?? '').trim()
      )
      setSuccessMessage(
        'Nếu email đã được đăng ký, hướng dẫn khôi phục sẽ được gửi đến hộp thư của bạn.'
      )
      if (result.resetUrl) setResetUrl(result.resetUrl)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page forgot-password-page min-h-screen bg-white">
      <SiteHeader />

      <main className="login-main forgot-password-main">
        <AuthIntro />

        <section className="forgot-password-card" aria-labelledby="forgot-password-title">
          <div className="card-brand"><BrandMark small /></div>
          <h2 id="forgot-password-title">Quên Mật Khẩu?</h2>
          <p className="forgot-password-description">
            Nhập địa chỉ email đăng ký của bạn. Chúng tôi sẽ gửi liên kết an toàn để bạn thiết lập lại mật khẩu.
          </p>

          <form className="forgot-password-form" onSubmit={handleSubmit}>
            <label htmlFor="recovery-email">EMAIL <span>*</span></label>
            <div className="input-wrap">
              <Mail size={15} aria-hidden="true" />
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={EMAIL_PLACEHOLDER}
                required
              />
            </div>

            {errorMessage && <p className="auth-feedback auth-feedback-error" role="alert">{errorMessage}</p>}
            {successMessage && <p className="auth-feedback auth-feedback-success" role="status">{successMessage}</p>}
            {resetUrl && (
              <a className="reset-link-preview" href={resetUrl}>
                Mở liên kết đặt lại mật khẩu (môi trường thử nghiệm)
              </a>
            )}

            <div className="recovery-info">
              <Info size={14} aria-hidden="true" />
              <p>
                Liên kết hướng dẫn khôi phục sẽ được gửi nếu email đã được đăng ký trên hệ thống.
              </p>
            </div>

            <button type="submit" className="submit-button" disabled={submitting}>
              GỬI LIÊN KẾT KHÔI PHỤC <span aria-hidden="true">→</span>
            </button>
          </form>

          <a className="back-to-login" href="/login">← Quay lại Đăng Nhập</a>
          <p className="recovery-support">
            Gặp sự cố khi nhận email?{' '}
            <a href="#lien-he">Liên hệ bộ phận trợ giúp EngMaster</a>
          </p>
        </section>
      </main>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { BookOpen, Info, Mail } from 'lucide-react'
import { LoginVisual, SiteFooter, SiteHeader } from './AuthShared'
import { authApi, getErrorMessage } from './auth-api'
import './login-page.css'
import './forgot-password-page.css'

const EMAIL_PLACEHOLDER = 'elena.vance@oxfordlinguistics.edu'

export function ForgotPasswordPage() {
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      await authApi.forgotPassword(
        String(formData.get('email') ?? '').trim()
      )
      window.location.assign('/login?passwordReset=sent')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page forgot-password-page min-h-screen bg-white">
      <SiteHeader />

      <main className="login-shell forgot-password-shell">
        <LoginVisual />

        <section className="login-form-panel" aria-labelledby="forgot-password-title">
          <div className="login-card forgot-password-card">
            <div className="login-brand">
              <span className="login-brand-icon"><BookOpen size={22} strokeWidth={2.4} /></span>
              <span className="login-brand-name">
                <strong>Your English Voice</strong>
                
              </span>
            </div>
            <h1 id="forgot-password-title">Quên mật khẩu?</h1>
            <p className="card-description forgot-password-description">
              Nhập địa chỉ email đăng ký để nhận mật khẩu tạm thời.
            </p>

            <form className="login-form forgot-password-form" onSubmit={handleSubmit}>
              <label htmlFor="recovery-email">EMAIL</label>
              <div className="input-wrap">
                <Mail size={15} aria-hidden="true" />
                <input
                  id="recovery-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder={EMAIL_PLACEHOLDER}
                  required
                />
              </div>
              {errorMessage && <p className="auth-feedback auth-feedback-error" role="alert">{errorMessage}</p>}

              <div className="recovery-info">
                <Info size={14} aria-hidden="true" />
                <p>
                  Nếu email đã được đăng ký, mật khẩu tạm thời sẽ được gửi đến hộp thư của bạn.
                </p>
              </div>

              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'ĐANG GỬI…' : 'GỬI MẬT KHẨU TẠM THỜI'}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <a className="back-to-login" href="/login">← Quay lại đăng nhập</a>
            <p className="recovery-support">
              Gặp sự cố khi nhận email?{' '}
              <a href="#lien-he">Liên hệ bộ phận trợ giúp EngMaster</a>
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

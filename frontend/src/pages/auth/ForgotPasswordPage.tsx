import { useState, type FormEvent } from 'react'
import { BookOpen, Info, Mail } from 'lucide-react'
import { LoginVisual } from './AuthShared'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { authApi, getErrorMessage } from './auth-api'
import './login-page.css'
import './forgot-password-page.css'

const EMAIL_PLACEHOLDER = 'hocvien@yourenglishvoice.vn'

export function ForgotPasswordPage() {
  const teacherMode = window.location.pathname.startsWith('/teacher/')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)

    try {
      const email = String(formData.get('email') ?? '').trim()
      if (teacherMode) await authApi.requestTeacherPasswordReset(email)
      else await authApi.forgotPassword(email)
      window.location.assign(teacherMode ? '/teacher/login?passwordReset=sent' : '/login?passwordReset=sent')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page forgot-password-page min-h-screen bg-white">
      <SiteHeader />

      <main className="login-main-container">
        <div className="login-shell forgot-password-shell">
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
              {teacherMode ? 'Nhập email tài khoản giáo viên để nhận liên kết đặt lại mật khẩu.' : 'Nhập email đăng ký để nhận hướng dẫn khôi phục tài khoản.'}
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
                  {teacherMode ? 'Nếu đây là tài khoản giáo viên đang hoạt động, liên kết đặt lại sẽ được gửi đến email.' : 'Nếu tài khoản tồn tại, hướng dẫn khôi phục sẽ được gửi đến hộp thư của bạn.'}
                </p>
              </div>

              <button type="submit" className="submit-button" disabled={submitting}>
                {submitting ? 'ĐANG GỬI…' : 'GỬI MẬT KHẨU TẠM THỜI'}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <a className="back-to-login" href={teacherMode ? '/teacher/login' : '/login'}>← Quay lại đăng nhập</a>
            <p className="recovery-support">
              Gặp sự cố khi nhận email?{' '}
              <a href="#lien-he">Liên hệ bộ phận hỗ trợ Your English Voice</a>
            </p>
          </div>
        </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

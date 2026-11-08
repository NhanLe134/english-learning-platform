import { useEffect, useState, type FormEvent } from 'react'
import {
  BookOpen,
  CheckCircle2,
  CalendarDays,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  Play,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { GoogleAuthButton, SiteFooter, SiteHeader } from './AuthShared'
import { EmailOtpVerification } from './EmailOtpVerification'
import { useAuth } from './auth-context'
import { authApi, getErrorMessage } from './auth-api'
import { readCheckoutCourse } from '../courses/course-data'
import { initiateGoogleRegistration } from './google-auth'
import './login-page.css'
import './register-page.css'

type RegistrationStage = 'details' | 'verification'

const MAX_BIRTH_DATE = new Date().toISOString().slice(0, 10)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function RegisterPage() {
  const course = readCheckoutCourse(window.location.search)
  const [stage, setStage] = useState<RegistrationStage>('details')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [verified, setVerified] = useState(false)
  const [otpDeliveryFailed, setOtpDeliveryFailed] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [developmentOtp, setDevelopmentOtp] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { setSession } = useAuth()

  useEffect(() => {
    const storedProfile = sessionStorage.getItem('google-registration-profile')
    if (!storedProfile) return

    sessionStorage.removeItem('google-registration-profile')
    try {
      const profile: unknown = JSON.parse(storedProfile)
      if (
        !profile || typeof profile !== 'object' ||
        !('email' in profile) || typeof profile.email !== 'string' ||
        !('fullName' in profile) || typeof profile.fullName !== 'string'
      ) {
        throw new Error('Thông tin Google để điền biểu mẫu không hợp lệ.')
      }
      setEmail(profile.email)
      setFullName(profile.fullName)
      setInfoMessage('Đã điền tên và email từ Google. Vui lòng bổ sung ngày sinh, số điện thoại và mật khẩu.')
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.delete('googleProfile')
      window.history.replaceState(
        null,
        '',
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể đọc thông tin Google.')
    }
  }, [])

  async function handleGoogleLogin() {
    setErrorMessage('')
    setSuccessMessage('')
    setInfoMessage('')
    await initiateGoogleRegistration({
      onSuccess: (profile) => {
        setEmail(profile.email)
        setFullName(profile.fullName)
        setInfoMessage('Đã điền tên và email từ Google. Vui lòng bổ sung ngày sinh, số điện thoại và mật khẩu.')
      },
      onError: (msg) => setErrorMessage(msg),
      onLoading: (loading) => setGoogleLoading(loading),
    })
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setInfoMessage('')
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')
    if (password.length < 8) {
      setErrorMessage('Mật khẩu phải chứa ít nhất 8 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.')
      return
    }
    if (new TextEncoder().encode(password).length > 72) {
      setErrorMessage('Mật khẩu không được vượt quá 72 byte UTF-8.')
      return
    }
    if (!acceptedTerms) {
      setErrorMessage('Vui lòng đồng ý với điều khoản và chính sách bảo mật.')
      return
    }

    setSubmitting(true)
    const normalizedEmail = String(formData.get('email') ?? '').trim()
    const validCourseId = course?.id && UUID_REGEX.test(course.id) ? [course.id] : []
    try {
      const registration = await authApi.register(
        String(formData.get('fullName') ?? '').trim(),
        String(formData.get('dateOfBirth') ?? ''),
        normalizedEmail,
        String(formData.get('phoneNumber') ?? '').trim(),
        password,
        confirmPassword,
        validCourseId
      )
      setEmail(registration.email)
      try {
        const result = await authApi.requestRegistrationOtp(registration.email)
        setOtpDeliveryFailed(false)
        setDevelopmentOtp(result.developmentOtp ?? '')
        setInfoMessage(result.developmentEmailFallback
          ? 'Resend chưa gửi được email; mã OTP tạm thời cho môi trường phát triển được hiển thị bên dưới.'
          : result.developmentOtp
            ? 'Mã OTP dùng cho kiểm thử phát triển được hiển thị bên dưới. Bạn cũng có thể kiểm tra email.'
            : 'Vui lòng kiểm tra hộp thư đến và mục thư rác để tìm mã xác minh.')
      } catch (error) {
        setOtpDeliveryFailed(true)
        setDevelopmentOtp('')
        setErrorMessage(getErrorMessage(error))
      }
      setStage('verification')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(otp: string) {
    setErrorMessage('')
    setSuccessMessage('')
    setInfoMessage('')
    setSubmitting(true)
    try {
      const session = await authApi.verifyRegistrationOtp(email, otp)
      setSession(session)
      setVerified(true)
      setSuccessMessage('Xác minh thành công. Tài khoản học viên của bạn đã sẵn sàng.')
      window.location.assign(`/checkout${window.location.search}`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend(): Promise<boolean> {
    setErrorMessage('')
    setSuccessMessage('')
    setInfoMessage('')
    try {
      const result = await authApi.requestRegistrationOtp(email)
      setOtpDeliveryFailed(false)
      setDevelopmentOtp(result.developmentOtp ?? '')
      setInfoMessage(result.developmentEmailFallback
        ? 'Resend chưa gửi được email; mã OTP tạm thời cho môi trường phát triển được hiển thị bên dưới.'
        : result.developmentOtp
          ? 'Mã OTP dùng cho kiểm thử phát triển được hiển thị bên dưới. Bạn cũng có thể kiểm tra email.'
          : 'Yêu cầu gửi lại đã được tiếp nhận. Vui lòng kiểm tra hộp thư đến và mục thư rác.')
      return true
    } catch (error) {
      setOtpDeliveryFailed(true)
      setDevelopmentOtp('')
      setErrorMessage(getErrorMessage(error))
      return false
    }
  }

  return (
    <div className="login-page register-page register-page-shell min-h-screen">
      <SiteHeader />

      <main className={`register-main${stage === 'verification' ? ' verification-main' : ''}`}>
        <nav className="register-breadcrumb" aria-label="Điều hướng đường dẫn">
          <a href="/courses">Khóa học</a>
          <ChevronRight size={13} aria-hidden="true" />
          <span>{stage === 'details' ? 'Đăng ký' : 'Xác minh email'}</span>
        </nav>

        <div className={`register-layout${stage === 'verification' ? ' verification-layout' : ''}`}>
          {stage === 'details' ? (
            <section className="register-card" aria-labelledby="register-title">
              <h1 id="register-title">Tạo Tài Khoản Học Viên</h1>
              <p className="card-description">
                Đăng ký ngay để bắt đầu khóa học của bạn và nhận bài kiểm tra năng lực miễn phí.
              </p>
              <>
                <GoogleAuthButton
                  onClick={() => void handleGoogleLogin()}
                  disabled={submitting || googleLoading}
                  loading={googleLoading}
                />
                <div className="auth-divider"><span>Hoặc điền vào biểu mẫu</span></div>
              </>

              <form className="register-form" onSubmit={(event) => void handleRegister(event)}>
                <div className="register-field-grid">
                  <div className="register-field">
                    <label htmlFor="full-name">HỌ VÀ TÊN <span>*</span></label>
                    <div className="input-wrap">
                      <UserRound size={15} aria-hidden="true" />
                      <input
                        id="full-name"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        maxLength={120}
                        placeholder="Nguyễn Văn An"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="register-field">
                    <label htmlFor="date-of-birth">NGÀY SINH <span>*</span></label>
                    <div className="input-wrap">
                      <CalendarDays size={15} aria-hidden="true" />
                      <input
                        id="date-of-birth"
                        name="dateOfBirth"
                        type="date"
                        autoComplete="bday"
                        max={MAX_BIRTH_DATE}
                        required
                      />
                    </div>
                  </div>

                  <div className="register-field register-field-wide">
                    <label htmlFor="register-email">ĐỊA CHỈ EMAIL <span>*</span></label>
                    <div className="input-wrap">
                      <Mail size={15} aria-hidden="true" />
                      <input
                        id="register-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={254}
                        placeholder="hocvien@yourenglishvoice.vn"
                        value={email}
                        required
                        onChange={(event) => setEmail(event.target.value.trim())}
                      />
                    </div>
                  </div>

                  <div className="register-field register-field-wide">
                    <label htmlFor="register-phone">SỐ ĐIỆN THOẠI <span>*</span></label>
                    <div className="input-wrap">
                      <Phone size={15} aria-hidden="true" />
                      <input
                        id="register-phone"
                        name="phoneNumber"
                        type="tel"
                        autoComplete="tel"
                        maxLength={32}
                        placeholder="0912 345 678"
                        required
                      />
                    </div>
                  </div>

                  <div className="register-field register-field-wide">
                    <label htmlFor="register-password">MẬT KHẨU <span>*</span></label>
                    <div className="input-wrap">
                      <LockKeyhole size={15} aria-hidden="true" />
                      <input
                        id="register-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        placeholder="Tối thiểu 8 ký tự"
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
                  </div>

                  <div className="register-field register-field-wide">
                    <label htmlFor="confirm-password">XÁC NHẬN MẬT KHẨU <span>*</span></label>
                    <div className="input-wrap">
                      <LockKeyhole size={15} aria-hidden="true" />
                      <input
                        id="confirm-password"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        minLength={8}
                        maxLength={72}
                        placeholder="Nhập lại mật khẩu"
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
                  </div>
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
                    <a href="#chinh-sach-bao-mat">Chính sách bảo mật</a> của Your English Voice.
                  </span>
                </label>

                {errorMessage && <p className="auth-feedback auth-feedback-error" role="alert">{errorMessage}</p>}
                {successMessage && <p className="auth-feedback auth-feedback-success" role="status">{successMessage}</p>}
                {infoMessage && <p className="auth-feedback auth-feedback-success" role="status">{infoMessage}</p>}

                <button type="submit" className="submit-button" disabled={submitting}>
                  {submitting ? 'ĐANG TẠO TÀI KHOẢN…' : 'XÁC THỰC NGAY'}
                  <span aria-hidden="true">→</span>
                </button>
              </form>
              <p className="signup-prompt">
                Đã có tài khoản học viên? <a href={`/login${window.location.search}`}>Đăng nhập ngay</a>
              </p>
            </section>
          ) : (
            <EmailOtpVerification
              email={email}
              submitting={submitting}
              verified={verified}
              errorMessage={errorMessage}
              infoMessage={infoMessage}
              successMessage={successMessage}
              developmentOtp={developmentOtp}
              canResendImmediately={otpDeliveryFailed}
              onVerify={(otp) => void handleVerify(otp)}
              onResend={handleResend}
              onChangeEmail={() => {
                setStage('details')
                setErrorMessage('')
                setInfoMessage('')
                setSuccessMessage('')
                setOtpDeliveryFailed(false)
                setDevelopmentOtp('')
              }}
            />
          )}

          {stage === 'details' && <aside className="register-course-panel" aria-label="Thông tin khóa học">
            <div className="register-course-visual">
              {course.thumbnailUrl
                ? <img src={course.thumbnailUrl} alt="" />
                : <div className="register-course-visual-art" aria-hidden="true"><BookOpen size={48} /></div>}
              <span className="register-course-play"><Play size={22} fill="currentColor" /></span>
              <span className="register-course-visual-caption">
                <Play size={13} fill="currentColor" /> Xem video preview
              </span>
            </div>
            <div className="register-course-content">
              <p className="register-course-kicker">{course.category} · {course.level}</p>
              <h2>{course.title}</h2>
              <p className="register-course-description">{course.details}</p>
              <div className="register-course-price" aria-label="Học phí ưu đãi">
                {course.originalPrice > course.price && (
                  <del>{formatCurrency(course.originalPrice)}</del>
                )}
                <strong>{formatCurrency(course.price)}</strong>
              </div>
              <p className="register-course-offer">
                <Sparkles size={15} aria-hidden="true" />
                Còn lại 4 suất giảm giá trong hôm nay
              </p>
              <h3>Khóa học bao gồm</h3>
              <ul>
                <li><CheckCircle2 size={16} /> {course.totalLessons} bài học theo lộ trình</li>
                <li><CheckCircle2 size={16} /> {course.details.split('·').slice(1).join(' · ').trim()}</li>
                <li><CheckCircle2 size={16} /> Giảng viên: {course.instructor}</li>
                <li><CheckCircle2 size={16} /> Nội dung học tập được sắp xếp theo lộ trình</li>
                <li><CheckCircle2 size={16} /> Theo dõi tiến độ và hỗ trợ học viên</li>
              </ul>
            </div>
          </aside>}
        </div>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}

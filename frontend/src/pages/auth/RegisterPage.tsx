import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
import { GoogleAuthButton } from './AuthShared'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { EmailOtpVerification } from './EmailOtpVerification'
import { authApi, getErrorMessage } from './auth-api'
import { readCheckoutCourse } from '../courses/course-data'
import { initiateGoogleRegistration } from './google-auth'
import {
  clearPendingCheckoutStudent,
  clearTemporaryRegistrationSecrets,
  hasTemporaryRegistrationSecretsExpired,
  navigateGuestFlow,
  PENDING_CHECKOUT_STUDENT_KEY,
  readPendingRegistrationDraft,
  readTemporaryRegistrationSecrets,
  REGISTRATION_SESSION_MAX_AGE_MS,
  savePendingRegistrationDraft,
  saveTemporaryRegistrationSecrets,
} from './registration-draft'
import './login-page.css'
import './register-page.css'

type RegistrationStage = 'details' | 'verification'

const MAX_BIRTH_DATE = new Date().toISOString().slice(0, 10)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const OTP_VALIDITY_MS = 10 * 60 * 1000
const OTP_RESEND_COOLDOWN_MS = 60 * 1000
const INVALID_PHONE_NUMBER_MESSAGE = 'Please enter a valid phone number.'
const PHONE_NUMBER_PATTERN = /^\+?[\d\s().-]+$/

function isValidRegistrationPhoneNumber(value: string): boolean {
  const trimmed = value.trim()
  const phoneDigits = trimmed.replace(/\D/g, '').length
  return (
    trimmed.length > 0 &&
    trimmed.length <= 32 &&
    PHONE_NUMBER_PATTERN.test(trimmed) &&
    (phoneDigits === 10 || phoneDigits === 11)
  )
}

function secondsUntil(isoTimestamp: string | null): number | undefined {
  if (!isoTimestamp) return undefined
  const targetMs = Date.parse(isoTimestamp)
  if (!Number.isFinite(targetMs)) return undefined
  return Math.max(0, Math.ceil((targetMs - Date.now()) / 1000))
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function RegisterPage({ search }: { search?: string } = {}) {
  const urlSearch = search ?? window.location.search
  const [savedDraft] = useState(() => readPendingRegistrationDraft())
  const [initialSecrets] = useState(() => readTemporaryRegistrationSecrets())
  const urlCourse = readCheckoutCourse(urlSearch)
  const hasUrlCourse = Boolean(urlCourse.id && UUID_REGEX.test(urlCourse.id))
  const course = hasUrlCourse
    ? urlCourse
    : savedDraft?.courseSearch
      ? readCheckoutCourse(savedDraft.courseSearch)
      : urlCourse
  const checkoutSearch = hasUrlCourse ? urlSearch : (savedDraft?.courseSearch || urlSearch)
  const currentSelectedCourseIds = useMemo(() => {
    if (course.id && UUID_REGEX.test(course.id)) return [course.id]
    return savedDraft?.selectedCourseIds.filter((id) => UUID_REGEX.test(id)) ?? []
  }, [course.id, savedDraft])

  const [stage, setStage] = useState<RegistrationStage>('details')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(() => initialSecrets.acceptedTerms)
  const [fullName, setFullName] = useState(() => savedDraft?.fullName ?? '')
  const [googleAccessToken, setGoogleAccessToken] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState(() => savedDraft?.dateOfBirth ?? '')
  const [phoneNumber, setPhoneNumber] = useState(() => savedDraft?.phoneNumber ?? '')
  const [email, setEmail] = useState(() => savedDraft?.email ?? '')
  const [password, setPassword] = useState(() => initialSecrets.password)
  const [confirmPassword, setConfirmPassword] = useState(() => initialSecrets.confirmPassword)
  const [otpPending, setOtpPending] = useState(() => savedDraft?.otpPending ?? false)
  const [otpSentAt, setOtpSentAt] = useState<string | null>(() => savedDraft?.otpSentAt ?? null)
  const [otpExpiresAt, setOtpExpiresAt] = useState<string | null>(() => savedDraft?.otpExpiresAt ?? null)
  const [savedDraftEmail, setSavedDraftEmail] = useState(() => savedDraft?.email ?? '')
  const normalizedDraftEmail = savedDraftEmail.trim().toLowerCase()
  const [verified, setVerified] = useState(false)
  const [otpDeliveryFailed, setOtpDeliveryFailed] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [developmentOtp, setDevelopmentOtp] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const verifiedRef = useRef(verified)
  const stageRef = useRef(stage)
  const draftSavedAtRef = useRef<number>(savedDraft?.savedAt ?? 0)

  useEffect(() => {
    verifiedRef.current = verified
  }, [verified])

  useEffect(() => {
    stageRef.current = stage
  }, [stage])

  useEffect(() => {
    if (draftSavedAtRef.current === 0) {
      draftSavedAtRef.current = Date.now()
    }
    const resetExpiredSessionState = () => {
      if (hasTemporaryRegistrationSecretsExpired()) {
        clearTemporaryRegistrationSecrets()
        setPassword('')
        setConfirmPassword('')
      }
      if (Date.now() - draftSavedAtRef.current >= REGISTRATION_SESSION_MAX_AGE_MS) {
        draftSavedAtRef.current = Date.now()
        setOtpPending(false)
        setOtpSentAt(null)
        setOtpExpiresAt(null)
        setVerified(false)
        setStage('details')
        clearPendingCheckoutStudent()
      }
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setGoogleLoading(false)
        setSubmitting(false)
        if (verifiedRef.current) {
          setStage('details')
          setVerified(false)
          setOtpPending(false)
          setOtpSentAt(null)
          setOtpExpiresAt(null)
          setOtpDeliveryFailed(false)
          setDevelopmentOtp('')
          setErrorMessage('')
          setSuccessMessage('')
          setInfoMessage('')
        }
      }
      resetExpiredSessionState()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        resetExpiredSessionState()
      }
    }

    const handlePopState = () => {
      if (window.location.pathname !== '/register') return
      const historyStage =
        window.history.state && typeof window.history.state === 'object'
          ? (window.history.state as { registerStage?: unknown }).registerStage
          : undefined
      if (stageRef.current === 'verification' && historyStage !== 'verification') {
        setStage('details')
        setErrorMessage('')
        setInfoMessage('')
        setSuccessMessage('')
        setOtpDeliveryFailed(false)
        setDevelopmentOtp('')
      }
    }

    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('popstate', handlePopState)
    window.addEventListener('focus', resetExpiredSessionState)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('focus', resetExpiredSessionState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!fullName && !dateOfBirth && !email && !phoneNumber && currentSelectedCourseIds.length === 0) {
      return
    }
    if (draftSavedAtRef.current === 0) {
      draftSavedAtRef.current = Date.now()
    }
    savePendingRegistrationDraft({
      fullName,
      dateOfBirth,
      email,
      phoneNumber,
      selectedCourseIds: currentSelectedCourseIds,
      courseSearch: checkoutSearch,
      otpPending,
      otpSentAt,
      otpExpiresAt,
      savedAt: draftSavedAtRef.current,
    })
  }, [checkoutSearch, currentSelectedCourseIds, dateOfBirth, email, fullName, otpExpiresAt, otpPending, otpSentAt, phoneNumber])



  async function handleGoogleLogin() {
    setErrorMessage('')
    setSuccessMessage('')
    setInfoMessage('')
    await initiateGoogleRegistration({
      onSuccess: (profile) => {
        draftSavedAtRef.current = Date.now()
        setEmail(profile.email)
        setFullName(profile.fullName)
        setGoogleAccessToken(profile.accessToken)
        setDateOfBirth(profile.dateOfBirth ?? '')
        setPhoneNumber(profile.phoneNumber ?? '')
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
    if (hasTemporaryRegistrationSecretsExpired()) {
      clearTemporaryRegistrationSecrets()
      setPassword('')
      setConfirmPassword('')
      setOtpPending(false)
      setOtpSentAt(null)
      setOtpExpiresAt(null)
      clearPendingCheckoutStudent()
      setErrorMessage('Phiên tạm thời đã hết hạn. Vui lòng nhập lại mật khẩu để tiếp tục đăng ký.')
      return
    }
    const normalizedPhoneNumber = phoneNumber.trim()
    if (
      (!normalizedPhoneNumber && !googleAccessToken) ||
      (normalizedPhoneNumber && !isValidRegistrationPhoneNumber(normalizedPhoneNumber))
    ) {
      setErrorMessage(INVALID_PHONE_NUMBER_MESSAGE)
      return
    }
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
    clearPendingCheckoutStudent()
    const normalizedFullName = fullName.trim()
    const normalizedDateOfBirth = dateOfBirth
    const normalizedEmail = email.trim()
    const validCourseId = currentSelectedCourseIds
    const nowMs = Date.now()
    draftSavedAtRef.current = nowMs
    saveTemporaryRegistrationSecrets({ password, confirmPassword, acceptedTerms }, nowMs)
    try {
      const registration = await authApi.register(
        normalizedFullName,
        normalizedDateOfBirth,
        normalizedEmail,
        normalizedPhoneNumber,
        password,
        confirmPassword,
        validCourseId,
        googleAccessToken || undefined
      )
      const resolvedFullName = registration.savedRegistration?.fullName || normalizedFullName
      const resolvedDateOfBirth = registration.savedRegistration?.dateOfBirth ?? normalizedDateOfBirth
      const resolvedPhoneNumber = registration.savedRegistration?.phoneNumber ?? normalizedPhoneNumber
      const resolvedCourseIds = registration.selectedCourseIds ?? validCourseId
      setFullName(resolvedFullName)
      if (resolvedDateOfBirth) setDateOfBirth(resolvedDateOfBirth)
      setPhoneNumber(resolvedPhoneNumber)
      setEmail(registration.email)
      setSavedDraftEmail(registration.email)
      setVerified(false)

      try {
        const result = await authApi.requestRegistrationOtp(registration.email)
        const otpNowMs = Date.now()
        const cooldownElapsed = !otpSentAt || (otpNowMs - Date.parse(otpSentAt)) >= OTP_RESEND_COOLDOWN_MS
        const previousExpired = !otpExpiresAt || Date.parse(otpExpiresAt) <= otpNowMs
        const nextSentAt = (cooldownElapsed || previousExpired || registration.email !== normalizedDraftEmail)
          ? new Date(otpNowMs).toISOString()
          : otpSentAt
        const nextExpiresAt = (cooldownElapsed || previousExpired || registration.email !== normalizedDraftEmail)
          ? new Date(otpNowMs + OTP_VALIDITY_MS).toISOString()
          : otpExpiresAt
        draftSavedAtRef.current = otpNowMs
        setOtpPending(true)
        setOtpSentAt(nextSentAt)
        setOtpExpiresAt(nextExpiresAt)
        savePendingRegistrationDraft({
          fullName: resolvedFullName,
          dateOfBirth: resolvedDateOfBirth,
          email: registration.email,
          phoneNumber: resolvedPhoneNumber,
          selectedCourseIds: resolvedCourseIds,
          courseSearch: checkoutSearch,
          otpPending: true,
          otpSentAt: nextSentAt,
          otpExpiresAt: nextExpiresAt,
          savedAt: otpNowMs,
        })
        setOtpDeliveryFailed(false)
        setDevelopmentOtp(result.developmentOtp ?? '')
        setInfoMessage(result.developmentEmailFallback
          ? 'Resend chưa gửi được email; mã OTP tạm thời cho môi trường phát triển được hiển thị bên dưới.'
          : result.developmentOtp
            ? 'Mã OTP dùng cho kiểm thử phát triển được hiển thị bên dưới. Bạn cũng có thể kiểm tra email.'
            : 'Vui lòng kiểm tra hộp thư đến và mục thư rác để tìm mã xác minh.')
      } catch (error) {
        const failedAtMs = Date.now()
        draftSavedAtRef.current = failedAtMs
        setOtpPending(true)
        savePendingRegistrationDraft({
          fullName: resolvedFullName,
          dateOfBirth: resolvedDateOfBirth,
          email: registration.email,
          phoneNumber: resolvedPhoneNumber,
          selectedCourseIds: resolvedCourseIds,
          courseSearch: checkoutSearch,
          otpPending: true,
          otpSentAt,
          otpExpiresAt,
          savedAt: failedAtMs,
        })
        setOtpDeliveryFailed(true)
        setDevelopmentOtp('')
        setErrorMessage(getErrorMessage(error))
      }
      const currentState =
        window.history.state && typeof window.history.state === 'object'
          ? (window.history.state as Record<string, unknown>)
          : {}
      if (currentState.registerStage !== 'verification') {
        window.history.pushState(
          { ...currentState, registerStage: 'verification' },
          '',
          `${window.location.pathname}${window.location.search}${window.location.hash}`
        )
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
      await authApi.verifyRegistrationOtp(email, otp)
      const verifiedAtMs = Date.now()
      draftSavedAtRef.current = verifiedAtMs
      setVerified(true)
      setOtpPending(false)
      setOtpSentAt(null)
      setOtpExpiresAt(null)
      saveTemporaryRegistrationSecrets({ password, confirmPassword, acceptedTerms }, verifiedAtMs)
      savePendingRegistrationDraft({
        fullName,
        dateOfBirth,
        email,
        phoneNumber,
        selectedCourseIds: currentSelectedCourseIds,
        courseSearch: checkoutSearch,
        otpPending: false,
        otpSentAt: null,
        otpExpiresAt: null,
        savedAt: verifiedAtMs,
      })
      try {
        sessionStorage.setItem(PENDING_CHECKOUT_STUDENT_KEY, JSON.stringify({
          fullName,
          email,
          phone: phoneNumber,
        }))
      } catch {
        // Checkout can still collect the required student details if storage is unavailable.
      }
      setSuccessMessage('Xác minh thành công. Đang chuyển đến thanh toán.')
      navigateGuestFlow(`/checkout${checkoutSearch}`)
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
      const nowMs = Date.now()
      draftSavedAtRef.current = nowMs
      const nextSentAt = new Date(nowMs).toISOString()
      const nextExpiresAt = new Date(nowMs + OTP_VALIDITY_MS).toISOString()
      setOtpPending(true)
      setOtpSentAt(nextSentAt)
      setOtpExpiresAt(nextExpiresAt)
      savePendingRegistrationDraft({
        fullName,
        dateOfBirth,
        email,
        phoneNumber,
        selectedCourseIds: currentSelectedCourseIds,
        courseSearch: checkoutSearch,
        otpPending: true,
        otpSentAt: nextSentAt,
        otpExpiresAt: nextExpiresAt,
        savedAt: nowMs,
      })
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
          <a href="/course">Khóa học</a>
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
                        onChange={(event) => {
                          draftSavedAtRef.current = Date.now()
                          setFullName(event.target.value)
                        }}
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
                        value={dateOfBirth}
                        onChange={(event) => {
                          draftSavedAtRef.current = Date.now()
                          setDateOfBirth(event.target.value)
                        }}
                        required={!googleAccessToken}
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
                        onChange={(event) => {
                          draftSavedAtRef.current = Date.now()
                          setEmail(event.target.value.trim())
                        }}
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
                        value={phoneNumber}
                        onChange={(event) => {
                          draftSavedAtRef.current = Date.now()
                          setPhoneNumber(event.target.value)
                        }}
                        required={!googleAccessToken}
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
                        value={password}
                        onChange={(event) => {
                          const nextPassword = event.target.value
                          setPassword(nextPassword)
                          saveTemporaryRegistrationSecrets({
                            password: nextPassword,
                            confirmPassword,
                            acceptedTerms,
                          })
                        }}
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
                        value={confirmPassword}
                        onChange={(event) => {
                          const nextConfirmPassword = event.target.value
                          setConfirmPassword(nextConfirmPassword)
                          saveTemporaryRegistrationSecrets({
                            password,
                            confirmPassword: nextConfirmPassword,
                            acceptedTerms,
                          })
                        }}
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
                    onChange={(event) => {
                      const checked = event.target.checked
                      setAcceptedTerms(checked)
                      saveTemporaryRegistrationSecrets({
                        password,
                        confirmPassword,
                        acceptedTerms: checked,
                      })
                    }}
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
                Đã có tài khoản học viên? <a href={`/login${checkoutSearch}`}>Đăng nhập ngay</a>
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
              initialRemainingSeconds={secondsUntil(otpExpiresAt)}
              initialResendSeconds={otpDeliveryFailed
                ? 0
                : otpSentAt && Number.isFinite(Date.parse(otpSentAt))
                  ? Math.max(0, Math.ceil((Date.parse(otpSentAt) + OTP_RESEND_COOLDOWN_MS - Date.now()) / 1000))
                  : undefined}
              onVerify={(otp) => void handleVerify(otp)}
              onResend={handleResend}
              onChangeEmail={() => {
                const historyStage =
                  window.history.state && typeof window.history.state === 'object'
                    ? (window.history.state as { registerStage?: unknown }).registerStage
                    : undefined
                if (historyStage === 'verification') {
                  window.history.back()
                  return
                }
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

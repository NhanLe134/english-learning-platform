import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react'
import {
  BadgeCheck,
  Clock3,
  Headset,
  LockKeyhole,
  Mail,
  PencilLine,
  ShieldCheck,
} from 'lucide-react'

const OTP_LENGTH = 6
const OTP_VALIDITY_SECONDS = 10 * 60
const RESEND_COOLDOWN_SECONDS = 60

interface EmailOtpVerificationProps {
  email: string
  submitting: boolean
  verified: boolean
  errorMessage: string
  infoMessage: string
  successMessage: string
  developmentOtp?: string
  canResendImmediately?: boolean
  onVerify: (otp: string) => void
  onResend: () => Promise<boolean>
  onChangeEmail: () => void
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function EmailOtpVerification({
  email,
  submitting,
  verified,
  errorMessage,
  infoMessage,
  successMessage,
  developmentOtp,
  canResendImmediately = false,
  onVerify,
  onResend,
  onChangeEmail,
}: EmailOtpVerificationProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''))
  const [remainingSeconds, setRemainingSeconds] = useState(OTP_VALIDITY_SECONDS)
  const [resendSeconds, setResendSeconds] = useState(
    canResendImmediately ? 0 : RESEND_COOLDOWN_SECONDS
  )
  const [resending, setResending] = useState(false)
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const otp = digits.join('')
  const expired = remainingSeconds === 0

  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((remaining) => Math.max(0, remaining - 1))
      setResendSeconds((remaining) => Math.max(0, remaining - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    inputs.current[0]?.focus()
  }, [])

  const updateDigits = (startIndex: number, value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, OTP_LENGTH - startIndex)
    if (!numbers) {
      setDigits((current) => current.map((digit, index) => index === startIndex ? '' : digit))
      return
    }

    setDigits((current) => {
      const next = [...current]
      for (let offset = 0; offset < numbers.length; offset += 1) {
        next[startIndex + offset] = numbers[offset] ?? ''
      }
      return next
    })
    inputs.current[Math.min(startIndex + numbers.length, OTP_LENGTH - 1)]?.focus()
  }

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') {
      event.preventDefault()
      if (digits[index]) {
        setDigits((current) => current.map((digit, digitIndex) => digitIndex === index ? '' : digit))
      } else if (index > 0) {
        setDigits((current) => current.map((digit, digitIndex) => digitIndex === index - 1 ? '' : digit))
        inputs.current[index - 1]?.focus()
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      inputs.current[index - 1]?.focus()
    } else if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault()
      inputs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!pasted) return
    event.preventDefault()
    updateDigits(index, pasted)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (otp.length === OTP_LENGTH && !expired && !verified) onVerify(otp)
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const sent = await onResend()
      if (!sent) return
      setDigits(Array(OTP_LENGTH).fill(''))
      setRemainingSeconds(OTP_VALIDITY_SECONDS)
      setResendSeconds(RESEND_COOLDOWN_SECONDS)
      inputs.current[0]?.focus()
    } finally {
      setResending(false)
    }
  }

  return (
    <section className="email-otp-card" aria-labelledby="email-otp-title">
      <div className="email-otp-icon" aria-hidden="true">
        <Mail size={27} strokeWidth={1.8} />
        <span><ShieldCheck size={15} strokeWidth={2.5} /></span>
      </div>
      <p className="email-otp-step">BƯỚC 2/3: <strong>BẢO MẬT TÀI KHOẢN</strong></p>
      <h1 id="email-otp-title">Xác Minh Địa Chỉ Email</h1>
      <p className="email-otp-description">
        Nếu địa chỉ cần xác minh, mã OTP sẽ được gửi đến:
      </p>
      <p className="email-otp-address">{email}</p>
      <p className="email-otp-note">
        Vui lòng kiểm tra hộp thư đến hoặc mục thư rác. Nếu chưa nhận được mã, hãy gửi lại sau khi hết thời gian chờ.
      </p>

      <form className="email-otp-form" onSubmit={handleSubmit}>
        <fieldset className="email-otp-inputs" disabled={submitting || verified || expired}>
          <legend className="auth-visually-hidden">Nhập mã xác minh 6 chữ số</legend>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(input) => { inputs.current[index] = input }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              aria-label={`Chữ số ${index + 1}`}
              aria-invalid={Boolean(errorMessage)}
              className={digit ? 'filled' : ''}
              value={digit}
              maxLength={1}
              onChange={(event) => updateDigits(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(event, index)}
            />
          ))}
        </fieldset>

        <div className={`email-otp-timer${expired ? ' expired' : ''}`} role="timer">
          <Clock3 size={15} aria-hidden="true" />
          {expired
            ? 'Mã OTP đã hết hạn'
            : <>Mã OTP có hiệu lực trong: <strong>{formatTime(remainingSeconds)}</strong></>}
        </div>

        {errorMessage && <p className="auth-feedback auth-feedback-error" role="alert">{errorMessage}</p>}
        {infoMessage && <p className="auth-feedback auth-feedback-info" role="status">{infoMessage}</p>}
        {developmentOtp && (
          <p className="auth-feedback auth-feedback-info" role="status">
            Mã OTP tạm thời (chỉ dùng khi phát triển): <strong>{developmentOtp}</strong>
          </p>
        )}
        {successMessage && <p className="auth-feedback auth-feedback-success" role="status">{successMessage}</p>}

        <button
          type="submit"
          className="submit-button email-otp-submit"
          disabled={otp.length !== OTP_LENGTH || expired || submitting || verified}
        >
          {submitting ? 'ĐANG XÁC MINH…' : verified ? 'ĐÃ XÁC MINH' : 'Xác Minh & Tiếp Tục'}
          {!submitting && !verified && <span aria-hidden="true">→</span>}
        </button>
      </form>

      <p className="email-otp-resend">
        Chưa nhận được mã?{' '}
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={resending || submitting || verified || resendSeconds > 0}
        >
          {resending
            ? 'Đang gửi mã…'
            : resendSeconds > 0
              ? `Gửi lại mã sau ${formatTime(resendSeconds)}`
              : 'Gửi lại mã xác minh'}
        </button>
      </p>

      <div className="email-otp-options">
        <button type="button" onClick={onChangeEmail} disabled={submitting || verified}>
          <PencilLine size={15} aria-hidden="true" />
          Đổi địa chỉ email khác
        </button>
        <a href="tel:19008888">
          <Headset size={16} aria-hidden="true" />
          Hỗ trợ: 1900 8888
        </a>
      </div>

      <div className="email-otp-security" aria-label="Thông tin bảo mật">
        <span><LockKeyhole size={13} /> Bảo mật SSL 256-bit</span>
        <span><ShieldCheck size={13} /> Tuân thủ GDPR</span>
        <span><BadgeCheck size={13} /> Chứng nhận An toàn Dữ liệu</span>
      </div>
    </section>
  )
}

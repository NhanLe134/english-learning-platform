import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Clock3,
  CreditCard,
  Headset,
  LockKeyhole,
  Pencil,
  QrCode,
  ShieldCheck,
  Smartphone,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { readCheckoutCourse } from '../courses/course-data'
import { type EnrollmentRecord, type PaymentMethod, ENROLLMENT_STORAGE_KEY } from './checkout-data'
import './checkout-page.css'

interface StudentDetails {
  fullName: string
  email: string
  phone: string
}

const HOLD_TIME_SECONDS = 15 * 60

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const remainder = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${remainder}`
}

function OrderHoldTimer({ onExpire }: { onExpire: () => void }) {
  const [remainingSeconds, setRemainingSeconds] = useState(HOLD_TIME_SECONDS)

  useEffect(() => {
    if (remainingSeconds === 0) {
      onExpire()
      return
    }

    const timer = setTimeout(() => {
      setRemainingSeconds((remaining) => Math.max(0, remaining - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [onExpire, remainingSeconds])

  return (
    <div className={`checkout-hold-timer${remainingSeconds === 0 ? ' expired' : ''}`} role="timer">
      <Clock3 size={14} />
      {remainingSeconds === 0
        ? 'Thời gian giữ chỗ đã hết'
        : <>Đơn hàng được giữ chỗ trong: <strong>{formatTime(remainingSeconds)}</strong></>}
    </div>
  )
}

function initialStudentDetails(): StudentDetails {
  return {
    fullName: '',
    email: '',
    phone: '',
  }
}

function EditStudentDialog({
  details,
  onClose,
  onSave,
}: {
  details: StudentDetails
  onClose: () => void
  onSave: (details: StudentDetails) => void
}) {
  const [formDetails, setFormDetails] = useState(details)
  const [errorMessage, setErrorMessage] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fullName = formDetails.fullName.trim()
    const email = formDetails.email.trim()
    const phone = formDetails.phone.trim()
    if (!fullName || !email || !phone) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin học viên.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Địa chỉ email chưa đúng định dạng.')
      return
    }
    onSave({ fullName, email, phone })
  }

  return (
    <div className="checkout-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section
        className="checkout-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-edit-title"
      >
        <button className="checkout-dialog-close" type="button" onClick={onClose} aria-label="Đóng">
          <X size={19} />
        </button>
        <span className="checkout-dialog-icon"><UserRound size={20} /></span>
        <h2 id="checkout-edit-title">Chỉnh sửa thông tin học viên</h2>
        <p>Thông tin này được dùng để xác nhận đơn hàng và kích hoạt khóa học.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Họ và tên
            <input
              autoFocus
              value={formDetails.fullName}
              onChange={(event) => setFormDetails({ ...formDetails, fullName: event.target.value })}
              maxLength={120}
              required
            />
          </label>
          <label>
            Địa chỉ Email
            <input
              type="email"
              value={formDetails.email}
              onChange={(event) => setFormDetails({ ...formDetails, email: event.target.value })}
              maxLength={254}
              required
            />
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              value={formDetails.phone}
              onChange={(event) => setFormDetails({ ...formDetails, phone: event.target.value })}
              maxLength={32}
              required
            />
          </label>
          {errorMessage && <p className="checkout-inline-error" role="alert">{errorMessage}</p>}
          <div className="checkout-dialog-actions">
            <button type="button" className="checkout-secondary-button" onClick={onClose}>Hủy</button>
            <button type="submit" className="checkout-primary-button">Lưu thông tin</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export function CheckoutPage() {
  const { user } = useAuth()
  const course = readCheckoutCourse(window.location.search)
  const discount = course.originalPrice - course.price
  const [student, setStudent] = useState(initialStudentDetails)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vietqr')
  const [expired, setExpired] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const copyMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const paymentTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentStudent = {
    fullName: student.fullName || user?.fullName || '',
    email: student.email || user?.email || '',
    phone: student.phone || user?.phoneNumber || '',
  }

  useEffect(() => () => {
    if (copyMessageTimer.current) clearTimeout(copyMessageTimer.current)
    if (paymentTimer.current) clearTimeout(paymentTimer.current)
  }, [])

  const expireOrder = useCallback(() => setExpired(true), [])

  function handlePayment() {
    if (processing || expired) return
    if (!currentStudent.fullName.trim() || !currentStudent.email.trim() || !currentStudent.phone.trim()) {
      setPaymentError('Vui lòng bổ sung đầy đủ thông tin học viên trước khi thanh toán.')
      setEditOpen(true)
      return
    }
    setPaymentError('')
    setProcessing(true)
    paymentTimer.current = setTimeout(() => {
      const enrollment: EnrollmentRecord = {
        orderId: '#LM-982417',
        courseId: course.id,
        courseTitle: course.title,
        amount: course.price,
        status: 'simulated_paid',
        paymentMethod,
        studentName: currentStudent.fullName,
        studentEmail: currentStudent.email,
        studentPhone: currentStudent.phone,
        createdAt: new Date().toISOString(),
      }

      try {
        window.localStorage.setItem(ENROLLMENT_STORAGE_KEY, JSON.stringify(enrollment))
        window.location.assign('/checkout/success')
      } catch {
        setPaymentError('Không thể lưu trạng thái ghi danh trên thiết bị này. Vui lòng thử lại.')
      }
    }, 1800)
  }

  return (
    <div className="login-page checkout-page">
      <SiteHeader />

      <main className="checkout-main">
        <div className="checkout-breadcrumb-row">
          <nav className="checkout-breadcrumb" aria-label="Điều hướng đường dẫn">
            <a href="/courses">Khóa học</a>
            <ChevronRight size={13} />
            <a href={`/courses/${encodeURIComponent(course.slug)}`}>{course.title}</a>
            <ChevronRight size={13} />
            <span>Thanh toán an toàn</span>
          </nav>
          <OrderHoldTimer onExpire={expireOrder} />
        </div>

        <div className="checkout-layout">
          <div className="checkout-main-column">
            <section className="checkout-card checkout-student-card" aria-labelledby="student-info-title">
              <header className="checkout-section-heading">
                <h1 id="student-info-title"><UserRound size={17} /> Thông tin học viên đăng ký</h1>
                <button type="button" className="checkout-edit-button" onClick={() => setEditOpen(true)}>
                  Chỉnh sửa thông tin <Pencil size={13} />
                </button>
              </header>
              <div className="checkout-student-fields">
                <div><span>Họ và tên</span><strong>{currentStudent.fullName || 'Chưa cập nhật'}</strong></div>
                <div><span>Địa chỉ Email</span><strong>{currentStudent.email || 'Chưa cập nhật'}</strong></div>
                <div><span>Số điện thoại</span><strong>{currentStudent.phone || 'Chưa cập nhật'}</strong></div>
              </div>
              <p className="checkout-student-note">
                <ShieldCheck size={14} />
                Tài khoản học trực tuyến cùng tài liệu độc quyền sẽ tự động gửi đến email trên ngay khi giao dịch thành công.
              </p>
            </section>

            <section className="checkout-card checkout-methods-card" aria-labelledby="payment-methods-title">
              <header className="checkout-section-heading checkout-methods-heading">
                <div>
                  <h2 id="payment-methods-title"><CreditCard size={17} /> Phương thức thanh toán trực tuyến</h2>
                  <p>Chọn một phương thức phù hợp để tiếp tục quy trình kích hoạt.</p>
                </div>
              </header>

              <div className="checkout-method-list" role="radiogroup" aria-label="Chọn phương thức thanh toán">
                <article className={`checkout-method-option${paymentMethod === 'vietqr' ? ' selected' : ''}`}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={paymentMethod === 'vietqr'}
                    className="checkout-method-select"
                    onClick={() => setPaymentMethod('vietqr')}
                  >
                    <span className="checkout-radio"><i /></span>
                    <span className="checkout-method-copy">
                      <strong>Chuyển khoản Ngân hàng qua VietQR <b>Khuyên Dùng</b></strong>
                      <small>Xử lý tự động 24/7 · Kích hoạt tài khoản ngay tức thì trong 30 giây</small>
                    </span>
                    <QrCode size={19} className="checkout-method-icon" />
                  </button>

                  {paymentMethod === 'vietqr' && (
                    <dl className="checkout-bank-details">
                      <div><dt>Ngân hàng:</dt><dd>Vietcombank (VCB)</dd></div>
                      <div>
                        <dt>Số tài khoản:</dt>
                        <dd>1029 8839 001</dd>
                      </div>
                      <div><dt>Chủ tài khoản:</dt><dd>YOUR VOICE ENGLISH</dd></div>
                      <div className="checkout-bank-amount"><dt>Số tiền chính xác:</dt><dd>{formatCurrency(course.price)}</dd></div>
                      <div className="checkout-bank-syntax">
                        <dt>Cú pháp chuyển khoản:</dt>
                        <dd>YOURENGLISHVOICE</dd>
                      </div>
                    </dl>
                  )}
                </article>

                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'card'}
                  className={`checkout-method-option checkout-method-select checkout-method-compact${paymentMethod === 'card' ? ' selected' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <span className="checkout-radio"><i /></span>
                  <span className="checkout-method-copy">
                    <strong>Thẻ tín dụng / Ghi nợ quốc tế</strong>
                    <small>Hỗ trợ thanh toán an toàn qua thẻ Visa, Mastercard, JCB</small>
                  </span>
                  <span className="checkout-card-brands" aria-label="Visa, Mastercard, JCB">
                    <b>VISA</b><i>●●</i><small>JCB</small>
                  </span>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={paymentMethod === 'wallet'}
                  className={`checkout-method-option checkout-method-select checkout-method-compact${paymentMethod === 'wallet' ? ' selected' : ''}`}
                  onClick={() => setPaymentMethod('wallet')}
                >
                  <span className="checkout-radio"><i /></span>
                  <span className="checkout-method-copy">
                    <strong>Ví điện tử MoMo / ZaloPay / Apple Pay</strong>
                    <small>Thanh toán tức thì bằng ứng dụng trên điện thoại di động</small>
                  </span>
                  <Smartphone size={17} className="checkout-method-icon" />
                </button>
              </div>
              {paymentMethod !== 'vietqr' && (
                <p className="checkout-simulated-method-note">
                  Phương thức này đang ở chế độ mô phỏng; không yêu cầu nhập thông tin thẻ hoặc ví.
                </p>
              )}
            </section>
          </div>

          <aside className="checkout-sidebar" aria-label="Tóm tắt đơn hàng">
            <section className="checkout-card checkout-summary-card" id="course-summary">
              <h2 className="checkout-summary-title"><BookOpen size={16} /> Tóm tắt đơn hàng</h2>
              <div className="checkout-course-mini-card">
                {course.thumbnailUrl
                  ? <img className="checkout-course-thumb-image" src={course.thumbnailUrl} alt="" />
                  : <div className="checkout-course-thumb" aria-hidden="true">
                      <BookOpen size={26} />
                      <span>{course.title}</span>
                    </div>}
                <div className="checkout-course-info">
                  <span className="checkout-course-badge">{course.category}</span>
                  <h3>{course.title}</h3>
                  <p>{course.details}</p>
                  <span className="checkout-instructor"><UserRound size={12} /> Giảng viên: {course.instructor}</span>
                </div>
              </div>

              <div className="checkout-price-block">
                <div className="checkout-price-row">
                  <span>Học phí niêm yết:</span>
                  <del>{formatCurrency(course.originalPrice)}</del>
                </div>
                <div className="checkout-price-row checkout-discount">
                  <span>Ưu đãi tuyển sinh ({Math.round(discount / course.originalPrice * 100)}%):</span>
                  <strong>-{formatCurrency(discount)}</strong>
                </div>
              </div>
              <div className="checkout-voucher">
                <div><BadgeCheck size={13} /><strong>Mã giảm giá đã áp dụng:</strong><b>LUMINA2025</b></div>
                <small>Ưu đãi khóa hè <strong>-0 đ</strong></small>
              </div>
              <div className="checkout-total">
                <strong>Tổng thanh toán:</strong>
                <div><b>{formatCurrency(course.price)}</b><small>Đã bao gồm VAT và toàn bộ giáo trình gốc</small></div>
              </div>

              {paymentError && <p className="checkout-inline-error" role="alert">{paymentError}</p>}
              <button
                type="button"
                className="checkout-primary-button checkout-pay-button"
                onClick={handlePayment}
                disabled={processing || expired}
              >
                {processing
                  ? <><span className="checkout-spinner" aria-hidden="true" /> ĐANG XÁC NHẬN…</>
                  : expired
                    ? 'ĐƠN HÀNG ĐÃ HẾT HẠN'
                    : <>Xác Nhận Thanh Toán ({course.price.toLocaleString('vi-VN')}đ) <ArrowRight size={17} /></>}
              </button>

              <ul className="checkout-guarantees">
                <li><LockKeyhole size={13} /> Thanh toán bảo mật mã hóa SSL 256-bit chuẩn PCI-DSS</li>
                <li><BadgeCheck size={13} /> Cam kết hoàn tiền 100% không lý do trong 7 ngày nếu chưa hài lòng</li>
              </ul>
            </section>

            <a className="checkout-support-card" href="tel:18006889">
              <Headset size={17} />
              <span><strong>Cần trợ giúp kích hoạt?</strong><small>Hotline hỗ trợ học viên 24/7</small></span>
              <b>1800 6889</b>
            </a>
            <p className="checkout-safe-note"><CircleHelp size={13} /> Chưa thực hiện giao dịch thật — đây là bản mô phỏng.</p>
          </aside>
        </div>
      </main>

      <SiteFooter brandName="Your English Voice" />

      {editOpen && (
        <EditStudentDialog
          details={currentStudent}
          onClose={() => setEditOpen(false)}
          onSave={(details) => {
            setStudent(details)
            setEditOpen(false)
          }}
        />
      )}
    </div>
  )
}

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
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { courseCatalogApi } from '../courses/services/courseCatalogApi'
import { readCheckoutCourse, type CourseReference } from '../courses/course-data'
import SePayVietQR from './SePayVietQR'
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

function VoucherBadge({
  code,
  description,
}: {
  code: string
  description: string
}) {
  return (
    <div className="checkout-voucher">
      <div>
        <BadgeCheck size={13} /><strong>Mã giảm giá đã áp dụng:</strong><b>{code}</b></div>
      <small>{description}</small>
    </div>
  )
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
  const [course, setCourse] = useState<CourseReference>(() => readCheckoutCourse(window.location.search))
  const [courseLoading, setCourseLoading] = useState(true)
  const [courseLoadError, setCourseLoadError] = useState('')
  const discount = course.originalPrice - course.price
  const [student, setStudent] = useState(initialStudentDetails)
  const [expired, setExpired] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [showQr, setShowQr] = useState(false)
  const copyMessageTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentStudent = {
    fullName: student.fullName || user?.fullName || '',
    email: student.email || user?.email || '',
    phone: student.phone || user?.phoneNumber || '',
  }

  useEffect(() => () => {
    if (copyMessageTimer.current) clearTimeout(copyMessageTimer.current)
  }, [])

  useEffect(() => {
    let active = true
    if (!course.id) {
      setCourseLoadError('Không tìm thấy khóa học cần thanh toán.')
      setCourseLoading(false)
      return () => { active = false }
    }
    setCourseLoading(true)
    void courseCatalogApi.get(course.id)
      .then((selectedCourse) => {
        if (active) setCourse(selectedCourse)
      })
      .catch((error: unknown) => {
        if (active) setCourseLoadError(error instanceof Error ? error.message : 'Không thể tải thông tin khóa học.')
      })
      .finally(() => {
        if (active) setCourseLoading(false)
      })
    return () => { active = false }
  }, [course.id])

  const expireOrder = useCallback(() => setExpired(true), [])
  const handleQrPaymentError = useCallback((message: string) => {
    setPaymentError(message)
    setProcessing(false)
    setShowQr(false)
  }, [])

  function handlePayment() {
    if (processing || expired || courseLoading || courseLoadError) return
    if (!currentStudent.fullName.trim() || !currentStudent.email.trim() || !currentStudent.phone.trim()) {
      setPaymentError('Vui lòng bổ sung đầy đủ thông tin học viên trước khi thanh toán.')
      setEditOpen(true)
      return
    }
    setPaymentError('')
    setProcessing(true)
    setShowQr(true)
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

              <div className="checkout-method-option selected">
                <span className="checkout-method-copy">
                  <strong>Chuyển khoản ngân hàng qua SePay</strong>
                  <small>Hoàn tất thanh toán trên trang bảo mật do SePay cung cấp.</small>
                </span>
                <QrCode size={19} className="checkout-method-icon" />
              </div>
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
              <VoucherBadge
  code="LUMINA2025"
  description="Ưu đãi khóa hè -0 đ"
/>
              <div className="checkout-total">
                <strong>Tổng thanh toán:</strong>
                <div><b>{formatCurrency(course.price)}</b><small>Đã bao gồm VAT và toàn bộ giáo trình gốc</small></div>
              </div>

              {/* SePay VietQR Payment Component */}
              {showQr && !expired && (
                <SePayVietQR
                  courseId={course.id}
                  onPaymentError={handleQrPaymentError}
                />
              )}

              {courseLoading && <p role="status">Đang tải thông tin khóa học…</p>}
              {courseLoadError && <p className="checkout-inline-error" role="alert">{courseLoadError}</p>}
              {paymentError && <p className="checkout-inline-error" role="alert">{paymentError}</p>}
              <button
                type="button"
                className="checkout-primary-button checkout-pay-button"
                onClick={handlePayment}
                disabled={processing || expired || showQr || courseLoading || Boolean(courseLoadError)}
              >
                {processing
                  ? <><span className="checkout-spinner" aria-hidden="true" /> ĐANG XÁC NHẬN…</>
                  : expired
                    ? 'ĐƠN HÀNG ĐÃ HẾT HẠN'
                    : <>Tạo đơn &amp; hiển thị QR ({course.price.toLocaleString('vi-VN')}đ) <ArrowRight size={17} /></>}
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
              <p className="checkout-safe-note"><CircleHelp size={13} /> Thanh toán được xác nhận sau khi SePay gửi thông báo bảo mật.</p>
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

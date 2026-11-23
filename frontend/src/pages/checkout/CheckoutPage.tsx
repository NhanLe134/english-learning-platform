import { useEffect, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronRight,
  CreditCard,
  Headset,
  Landmark,
  LockKeyhole,
  Pencil,
  QrCode,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { readCheckoutCourse, type CourseReference } from '../courses/course-data'
import { courseCatalogApi } from '../courses/services/courseCatalogApi'
import { paymentSupportPhone, savePaymentInstructions } from './payment-config'
import { sepayApi } from './sepayApi'
import './checkout-page.css'

interface StudentDetails {
  fullName: string
  email: string
  phone: string
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)

function initialStudentDetails(): StudentDetails {
  try {
    const saved = sessionStorage.getItem('your-voice-pending-checkout-student')
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<StudentDetails>
      if (typeof parsed.fullName === 'string' && typeof parsed.email === 'string') {
        return {
          fullName: parsed.fullName,
          email: parsed.email,
          phone: typeof parsed.phone === 'string' ? parsed.phone : '',
        }
      }
    }
  } catch {
    // Session storage is optional prefill only; the server verifies DB account state.
  }
  return { fullName: '', email: '', phone: '' }
}

function EditStudentDialog({
  details,
  requireEmailOnly,
  onClose,
  onSave,
}: {
  details: StudentDetails
  requireEmailOnly: boolean
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
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Địa chỉ email chưa đúng định dạng.')
      return
    }
    if (!requireEmailOnly && !fullName) {
      setErrorMessage('Vui lòng nhập đầy đủ họ tên và email học viên.')
      return
    }
    onSave({ fullName, email, phone })
  }

  return (
    <div
      className="checkout-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
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
        <p>Thông tin này được dùng để đối chiếu tài khoản đã xác minh và kích hoạt khóa học.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Họ và tên
            <input
              autoFocus
              value={formDetails.fullName}
              onChange={(event) => setFormDetails({ ...formDetails, fullName: event.target.value })}
              maxLength={120}
              required={!requireEmailOnly}
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
  const { accessToken, user } = useAuth()
  const [initialUrl] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const initialCourse = readCheckoutCourse(window.location.search)
    const queryIdentifier = params.get('courseId')?.trim() || params.get('slug')?.trim() || ''
    const orderIdParam = params.get('orderId')?.trim() ?? ''
    const paymentReturnParam = params.get('payment')
    return {
      initialCourse,
      targetIdentifier: queryIdentifier || initialCourse.id || initialCourse.slug,
      orderIdParam,
      paymentReturnParam,
    }
  })

  const [course, setCourse] = useState<CourseReference>(initialUrl.initialCourse)
  const [courseLoading, setCourseLoading] = useState(() =>
    Boolean(initialUrl.orderIdParam || initialUrl.targetIdentifier),
  )
  const [courseLoadError, setCourseLoadError] = useState(() =>
    !initialUrl.orderIdParam && !initialUrl.targetIdentifier ? 'Không tìm thấy khóa học cần thanh toán.' : '',
  )
  const [returnOrderStatus, setReturnOrderStatus] = useState<string>('')
  const [student, setStudent] = useState(initialStudentDetails)
  const [processing, setProcessing] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  const paymentReturn = initialUrl.paymentReturnParam
  const returnOrderId = initialUrl.orderIdParam
  const showPaymentReturnNotice = paymentReturn === 'cancel' || paymentReturn === 'error'

  const summaryCourse = course
  const discount = Math.max(0, summaryCourse.originalPrice - summaryCourse.price)
  const currentStudent = {
    fullName: student.fullName || user?.fullName || '',
    email: student.email || user?.email || '',
    phone: student.phone || user?.phoneNumber || '',
  }

  useEffect(() => {
    const orderIdParam = initialUrl.orderIdParam
    const fallbackIdentifier = initialUrl.targetIdentifier
    if (!orderIdParam && !fallbackIdentifier) return

    let active = true

    async function loadCheckoutTarget() {
      let resolvedCourseIdentifier = fallbackIdentifier
      let orderResolved = false

      if (orderIdParam) {
        try {
          const currentOrder = await sepayApi.getOrderStatus(orderIdParam, accessToken)
          if (!active) return
          orderResolved = true
          if (currentOrder.status === 'paid') {
            window.location.replace(`/checkout/success?orderId=${encodeURIComponent(orderIdParam)}`)
            return
          }
          setReturnOrderStatus(currentOrder.status)
          if (currentOrder.courseId) {
            resolvedCourseIdentifier = currentOrder.courseId
          }
        } catch (cause: unknown) {
          if (!active) return
          if (!resolvedCourseIdentifier) {
            setCourseLoadError(cause instanceof Error ? cause.message : 'Không thể tải thông tin đơn hàng.')
            setCourseLoading(false)
            return
          }
        }
      }

      if (!resolvedCourseIdentifier) {
        setCourseLoadError(
          orderResolved
            ? 'Không xác định được khóa học cho đơn hàng này.'
            : 'Không tìm thấy khóa học cần thanh toán.',
        )
        setCourseLoading(false)
        return
      }

      try {
        const fetchedCourse = await courseCatalogApi.get(resolvedCourseIdentifier, accessToken ?? undefined)
        if (!active) return
        setCourse(fetchedCourse)
        setCourseLoadError('')
      } catch (cause: unknown) {
        if (!active) return
        setCourseLoadError(cause instanceof Error ? cause.message : 'Không thể tải thông tin khóa học.')
      } finally {
        if (active) setCourseLoading(false)
      }
    }

    void loadCheckoutTarget()
    return () => {
      active = false
    }
  }, [accessToken, initialUrl.orderIdParam, initialUrl.targetIdentifier])

  async function handlePayment() {
    if (processing || courseLoading || courseLoadError) return
    if (!accessToken) {
      const email = currentStudent.email.trim()
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setPaymentError('Vui lòng nhập địa chỉ email đăng ký đã xác minh trước khi tạo đơn hàng.')
        setEditOpen(true)
        return
      }
    }
    setPaymentError('')
    setProcessing(true)
    try {
      const createdOrder = await sepayApi.createOrder(
        { courseId: course.id, email: currentStudent.email },
        accessToken,
      )
      savePaymentInstructions(createdOrder.orderId, createdOrder.paymentInformation)
      window.location.assign(`/checkout/payment?orderId=${encodeURIComponent(createdOrder.orderId)}`)
    } catch (cause: unknown) {
      setPaymentError(cause instanceof Error ? cause.message : 'Không thể tạo đơn thanh toán.')
      setProcessing(false)
    }
  }

  return (
    <div className="login-page checkout-page">
      <SiteHeader />

      <main className="checkout-main">
        <div className="checkout-breadcrumb-row">
          <nav className="checkout-breadcrumb" aria-label="Điều hướng đường dẫn">
            <a href="/courses">Khóa học</a>
            <ChevronRight size={13} />
            <a href={`/courses/${encodeURIComponent(summaryCourse.slug)}`}>{summaryCourse.title}</a>
            <ChevronRight size={13} />
            <span>Thanh toán an toàn</span>
          </nav>
        </div>

        {showPaymentReturnNotice && (
          <section className="checkout-return-notice" role="status" aria-live="polite">
            <div>
              <strong>
                {paymentReturn === 'cancel'
                  ? 'Bạn đã quay lại từ trang thanh toán.'
                  : 'SePay chưa gửi xác nhận thanh toán thành công.'}
              </strong>
              <p>
                {returnOrderStatus
                  ? `Trạng thái đơn hàng hiện tại là "${returnOrderStatus}". Tài khoản và khóa học chỉ được kích hoạt sau khi hệ thống xác thực thông báo từ SePay.`
                  : 'Trạng thái thanh toán chỉ được xác nhận sau khi hệ thống nhận và kiểm tra thông báo từ SePay.'}
              </p>
            </div>
            {returnOrderId && (
              <a href={`/checkout/payment?orderId=${encodeURIComponent(returnOrderId)}`}>
                Tiếp tục thanh toán đơn hàng <ChevronRight size={15} />
              </a>
            )}
          </section>
        )}

        <div className="checkout-layout">
          <div className="checkout-main-column">
            <section className="checkout-card checkout-student-card" aria-labelledby="student-info-title">
              <header className="checkout-section-heading">
                <h1 id="student-info-title"><UserRound size={18} /> Thông tin học viên đăng ký</h1>
                {!accessToken && (
                  <button type="button" className="checkout-edit-button" onClick={() => setEditOpen(true)}>
                    Chỉnh sửa thông tin <Pencil size={13} />
                  </button>
                )}
              </header>
              <div className="checkout-student-fields">
                <div><span>Họ và tên</span><strong>{currentStudent.fullName || 'Chưa cập nhật'}</strong></div>
                <div><span>Địa chỉ Email</span><strong>{currentStudent.email || 'Chưa cập nhật'}</strong></div>
                <div><span>Số điện thoại</span><strong>{currentStudent.phone || 'Chưa cập nhật'}</strong></div>
              </div>
              <p className="checkout-student-note">
                <ShieldCheck size={14} />
                Tài khoản học trực tuyến và quyền truy cập khóa học sẽ được kích hoạt ngay sau khi SePay xác nhận thanh toán.
              </p>
            </section>

            <section className="checkout-card checkout-methods-card" aria-labelledby="payment-methods-title">
              <header className="checkout-section-heading checkout-methods-heading">
                <div>
                  <h2 id="payment-methods-title"><CreditCard size={18} /> Phương thức thanh toán trực tuyến</h2>
                  <p>Thanh toán chuyển khoản ngân hàng qua cổng thanh toán SePay.</p>
                </div>
              </header>

              <div className="checkout-method-option selected">
                <span className="checkout-method-copy">
                  <strong>Chuyển khoản ngân hàng qua SePay</strong>
                  <small>Quét mã QR chuyển khoản. SePay sẽ tự động xác nhận giao dịch và kích hoạt khóa học.</small>

                  <div className="sepay-banks-tag">
                    <Landmark size={14} />
                    <span>Hỗ trợ ngân hàng: Techcombank, MB Bank, VIB, Vietcombank...</span>
                  </div>
                </span>

                <QrCode size={50} className="checkout-method-icon" />
              </div>
            </section>
          </div>

          <aside className="checkout-sidebar" aria-label="Tóm tắt đơn hàng">
            <section className="checkout-card checkout-summary-card" id="course-summary">
              <h2 className="checkout-summary-title"><BookOpen size={20} /> Tóm tắt đơn hàng</h2>

              <div className="checkout-course-mini-card">
                {summaryCourse.thumbnailUrl
                  ? <img className="checkout-course-thumb-image" src={summaryCourse.thumbnailUrl} alt="" />
                  : (
                    <div className="checkout-course-thumb" aria-hidden="true">
                      <BookOpen size={26} />
                      <span>{summaryCourse.title}</span>
                    </div>
                  )}
                <div className="checkout-course-info">
                  <span className="checkout-course-badge">{summaryCourse.category}</span>
                  <h3>{summaryCourse.title}</h3>
                  <p>{summaryCourse.details}</p>
                  <span className="checkout-instructor"><UserRound size={12} /> Giảng viên: {course.instructor}</span>
                </div>
              </div>

              <div className="checkout-price-block">
                <div className="checkout-price-row">
                  <span>Học phí niêm yết:</span>
                  {discount > 0
                    ? <del>{formatCurrency(summaryCourse.originalPrice)}</del>
                    : <strong>{formatCurrency(summaryCourse.originalPrice)}</strong>}
                </div>
                {discount > 0 && (
                  <div className="checkout-price-row checkout-discount">
                    <span>
                      Ưu đãi tuyển sinh ({summaryCourse.originalPrice > 0
                        ? Math.round((discount / summaryCourse.originalPrice) * 100)
                        : 0}%):
                    </span>
                    <strong>-{formatCurrency(discount)}</strong>
                  </div>
                )}
              </div>
              <div className="checkout-total">
                <strong>Tổng tiền cần thanh toán:</strong>
                <div><b>{formatCurrency(summaryCourse.price)}</b><small>Đơn hàng gồm 1 khóa học · VND</small></div>
              </div>

              {courseLoading && <p role="status">Đang tải thông tin khóa học…</p>}
              {courseLoadError && <p className="checkout-inline-error" role="alert">{courseLoadError}</p>}
              {paymentError && <p className="checkout-inline-error" role="alert">{paymentError}</p>}
              <button
                type="button"
                className="checkout-primary-button checkout-pay-button"
                onClick={() => void handlePayment()}
                disabled={processing || courseLoading || Boolean(courseLoadError)}
              >
                {processing
                  ? <><span className="checkout-spinner" aria-hidden="true" /> ĐANG TẠO ĐƠN…</>
                  : <>Tạo đơn &amp; tiếp tục thanh toán ({formatCurrency(summaryCourse.price)}) <ArrowRight size={17} /></>}
              </button>

              <ul className="checkout-guarantees">
                <li><LockKeyhole size={18} /> Thông tin thanh toán được xử lý bảo mật qua SePay.</li>
                <li><BadgeCheck size={18} /> Khóa học và tài khoản chỉ được kích hoạt sau khi giao dịch được xác thực.</li>
              </ul>
            </section>

            {paymentSupportPhone && (
              <a className="checkout-support-card" href={`tel:${paymentSupportPhone}`}>
                <Headset size={18} />
                <span><strong>Cần trợ giúp kích hoạt?</strong><small>Hotline hỗ trợ học viên 24/7</small></span>
                <b>{paymentSupportPhone}</b>
              </a>
            )}
          </aside>
        </div>
      </main>

      <SiteFooter brandName="Your English Voice" />

      {editOpen && (
        <EditStudentDialog
          details={currentStudent}
          requireEmailOnly={!accessToken}
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

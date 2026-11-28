import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Headset,
  QrCode,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { StudentHeader } from '../courses/components/StudentHeader'
import { readCheckoutCourse, type CourseReference } from '../courses/course-data'
import { courseCatalogApi } from '../courses/services/courseCatalogApi'
import { paymentSupportPhone, savePaymentInstructions } from './payment-config'
import { buildPaymentPageUrl, readPaymentReturnPath, resolvePaymentBackHref, savePaymentReturnPath, validatePaymentReturnPath } from './payment-navigation'
import { sepayApi } from './sepayApi'
import {
  formatOrderStatusVietnamese,
  translateErrorMessageToVietnamese,
} from '../auth/vietnamese-messages'
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
  const [student] = useState(initialStudentDetails)
  const [processing, setProcessing] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    const resetStaleLoadingState = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setProcessing(false)
      }
    }
    window.addEventListener('pageshow', resetStaleLoadingState)
    return () => {
      window.removeEventListener('pageshow', resetStaleLoadingState)
    }
  }, [])

  const paymentReturn = initialUrl.paymentReturnParam
  const returnOrderId = initialUrl.orderIdParam
  const showPaymentReturnNotice = paymentReturn === 'cancel' || paymentReturn === 'error'
  const search = typeof window === 'undefined' ? '' : window.location.search
  const courseStorageKey = course.id
    ? `course:${course.id}`
    : initialUrl.targetIdentifier
      ? `course:${initialUrl.targetIdentifier}`
      : undefined
  const courseFallbackPath = course.slug ? `/courses/${encodeURIComponent(course.slug)}` : null
  const backHref = resolvePaymentBackHref({
    search,
    storageKey: courseStorageKey,
    fallbackPath: courseFallbackPath,
    userRole: user?.role,
  })

  const isAuthenticatedStudent = user?.role === 'STUDENT' && Boolean(accessToken)
  const summaryCourse = course
  const discount = Math.max(0, summaryCourse.originalPrice - summaryCourse.price)
  const currentStudent = isAuthenticatedStudent
    ? {
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
      }
    : {
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
            setCourseLoadError(
              translateErrorMessageToVietnamese(
                cause instanceof Error ? cause.message : '',
                'Không thể tải thông tin đơn hàng.',
              ),
            )
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
        setCourseLoadError(
          translateErrorMessageToVietnamese(
            cause instanceof Error ? cause.message : '',
            'Không thể tải thông tin khóa học.',
          ),
        )
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
      const originToCarry =
        validatePaymentReturnPath(new URLSearchParams(search).get('returnTo'), user?.role) ??
        (courseStorageKey
          ? validatePaymentReturnPath(readPaymentReturnPath(courseStorageKey), user?.role)
          : null) ??
        validatePaymentReturnPath(courseFallbackPath, user?.role)
      savePaymentReturnPath(createdOrder.orderId, originToCarry)
      window.location.assign(buildPaymentPageUrl(createdOrder.orderId, originToCarry))
    } catch (cause: unknown) {
      setPaymentError(
        translateErrorMessageToVietnamese(
          cause instanceof Error ? cause.message : '',
          'Không thể tạo đơn thanh toán.',
        ),
      )
      setProcessing(false)
    }
  }

  return (
    <div className="login-page checkout-page">
      {user?.role === 'STUDENT' ? (
        <StudentHeader activePage="other-courses" />
      ) : (
        <SiteHeader />
      )}

      <main className="checkout-main">
        <div className="checkout-breadcrumb-row">
          <nav className="checkout-breadcrumb" aria-label="Điều hướng đường dẫn">
            <a href="/course">{isAuthenticatedStudent ? 'Các khóa học khác' : 'Khóa học'}</a>
            <ChevronRight size={13} />
            <a href={summaryCourse.slug ? `/courses/${encodeURIComponent(summaryCourse.slug)}` : backHref}>{summaryCourse.title}</a>
            <ChevronRight size={13} />
            <span>Thanh toán an toàn</span>
          </nav>
          {isAuthenticatedStudent && (
            <a href={backHref} className="checkout-breadcrumb">
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Quay lại</span>
            </a>
          )}
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
                  ? `Trạng thái đơn hàng hiện tại là "${formatOrderStatusVietnamese(returnOrderStatus)}". Tài khoản và khóa học chỉ được kích hoạt sau khi hệ thống xác thực thông báo từ SePay.`
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
                <h1 id="student-info-title">Thông tin học viên đăng ký</h1>
              </header>
              <div className="checkout-student-fields">
                <div><span>Họ và tên</span><strong>{currentStudent.fullName || 'Chưa cập nhật'}</strong></div>
                <div><span>Địa chỉ Email</span><strong>{currentStudent.email || 'Chưa cập nhật'}</strong></div>
                <div><span>Số điện thoại</span><strong>{currentStudent.phone || 'Chưa cập nhật'}</strong></div>
              </div>
              <p className="checkout-student-note">
                Tài khoản học trực tuyến và quyền truy cập khóa học sẽ được kích hoạt ngay sau khi SePay xác nhận thanh toán.
              </p>
            </section>

            <section className="checkout-card checkout-methods-card" aria-labelledby="payment-methods-title">
              <header className="checkout-section-heading checkout-methods-heading">
                <div>
                  <h2 id="payment-methods-title">Phương thức thanh toán trực tuyến</h2>
                  <p>Thanh toán chuyển khoản ngân hàng qua cổng thanh toán SePay.</p>
                </div>
              </header>

              <div className="checkout-method-option selected">
                <span className="checkout-method-copy">
                  <strong>Chuyển khoản ngân hàng qua SePay</strong>
                  <small>Quét mã QR chuyển khoản. SePay sẽ tự động xác nhận giao dịch và kích hoạt khóa học.</small>

                  <div className="sepay-banks-tag">
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
                <strong>Tổng tiền:</strong>
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
                  : isAuthenticatedStudent
                    ? <>Tạo đơn &amp; tiếp tục thanh toán ({formatCurrency(summaryCourse.price)}) <ArrowRight size={17} /></>
                    : <>Tạo đơn &amp; thanh toán ({formatCurrency(summaryCourse.price)}) <ArrowRight size={17} /></>}
              </button>

              <ul className="checkout-guarantees">
                <li>Thông tin thanh toán được xử lý bảo mật qua SePay.</li>
                <li>Khóa học và tài khoản chỉ được kích hoạt sau khi giao dịch được xác thực.</li>
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
    </div>
  )
}

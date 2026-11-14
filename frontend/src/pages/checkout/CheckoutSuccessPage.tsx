import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  Loader2,
  Tag,
  UserRound,
  XCircle,
} from 'lucide-react'
import { SiteHeader } from '../../components/layout/SiteHeader'
import { SiteFooter } from '../../components/layout/SiteFooter'
import { useAuth } from '../auth/auth-context'
import { sepayApi } from './sepayApi'
import { paymentConfirmationTimeoutMs, paymentPollingIntervalMs, paymentSupportPhone, readPaymentInstructions } from './payment-config'
import type { CreateOrderResponse } from './sepayApi'
import './checkout-page.css'
import './checkout-success-page.css'

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} ₫`

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không có thông tin'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function CheckoutSuccessPage({ initialOrder }: { initialOrder?: CreateOrderResponse }) {
  const orderId = initialOrder?.orderId ?? (typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('orderId') ?? '')
  return <CheckoutSuccessView key={orderId || 'missing-order'} initialOrder={initialOrder} />
}

function CheckoutSuccessView({ initialOrder }: { initialOrder?: CreateOrderResponse }) {
  const { accessToken, user } = useAuth()
  const orderId = initialOrder?.orderId ?? new URLSearchParams(window.location.search).get('orderId') ?? ''
  const [savedInstructions] = useState(() => initialOrder?.paymentInformation ?? readPaymentInstructions(orderId))
  const [order, setOrder] = useState<Awaited<ReturnType<typeof sepayApi.getOrderStatus>> | null>(() => initialOrder ? {
    orderId: initialOrder.orderId,
    courseId: initialOrder.course.id,
    courseTitle: initialOrder.course.title,
    status: initialOrder.status,
    amount: initialOrder.amount,
    paymentMethod: 'BANK_TRANSFER',
    transferContent: initialOrder.transferContent,
    providerTransactionId: null,
    paidAt: null,
    expiredAt: initialOrder.expiredAt,
    createdAt: initialOrder.createdAt,
    courseDetails: null,
    courseDetailsUnavailable: false,
    enrollmentExists: false,
  } : null)
  const [orderStatus, setOrderStatus] = useState<string | null>(initialOrder?.status ?? null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [checking, setChecking] = useState(false)
  const startedAt = useRef(0)
  const inFlight = useRef(false)
  const currentStatus = useRef<string | null>(initialOrder?.status ?? null)
  const missingOrderInfo = !orderId

  useEffect(() => {
    if (missingOrderInfo) return
    startedAt.current = Date.now()
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopWatching: (() => void) | undefined
    const refresh = async (manual = false) => {
      if (!active || inFlight.current) return
      inFlight.current = true
      if (manual) setChecking(true)
      try {
        const current = await sepayApi.getOrderStatus(orderId, accessToken)
        if (!active) return
        setOrder(current)
        setOrderStatus(current.status)
        currentStatus.current = current.status
        if (['paid', 'expired', 'failed', 'cancelled'].includes(current.status)) stopWatching?.()
        setError('')
        setLoading(false)
        setTimedOut(Date.now() - startedAt.current >= paymentConfirmationTimeoutMs && current.status === 'pending')
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra trạng thái đơn hàng.')
        setLoading(false)
      } finally {
        inFlight.current = false
        if (manual) setChecking(false)
      }
    }
    const poll = () => {
      if (!active) return
      const terminalNow = ['paid', 'expired', 'failed', 'cancelled'].includes(currentStatus.current ?? '')
      if (terminalNow) return
      if (Date.now() - startedAt.current >= paymentConfirmationTimeoutMs) {
        setTimedOut(true)
        return
      }
      timer = setTimeout(() => {
        timer = undefined
        if (['paid', 'expired', 'failed', 'cancelled'].includes(currentStatus.current ?? '')) return
        void refresh().finally(poll)
      }, paymentPollingIntervalMs)
    }
    const timeoutTimer = setTimeout(() => {
      if (!['paid', 'expired', 'failed', 'cancelled'].includes(currentStatus.current ?? '')) setTimedOut(true)
    }, paymentConfirmationTimeoutMs)
    stopWatching = accessToken ? sepayApi.watchOrderStatus(orderId, accessToken, (message) => {
      if (!active) return
      if ((message.kind === 'order' && ['paid', 'expired', 'failed', 'cancelled'].includes(message.status)) || (message.kind === 'connection' && message.status === 'subscribed')) {
        // Events only wake the status API; the API response remains authoritative.
        void refresh()
      }
    }) : undefined
    // Polling starts after the immediate status request settles.
    void refresh().finally(poll)
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      clearTimeout(timeoutTimer)
      stopWatching?.()
    }
  }, [accessToken, orderId, missingOrderInfo])

  async function checkPaymentStatus() {
    if (!orderId || inFlight.current) return
    inFlight.current = true
    setChecking(true)
    try {
      const current = await sepayApi.getOrderStatus(orderId, accessToken)
      setOrder(current)
      setOrderStatus(current.status)
      currentStatus.current = current.status
      setError('')
      setTimedOut(Date.now() - startedAt.current >= paymentConfirmationTimeoutMs && current.status === 'pending')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Khong the kiem tra trang thai don hang.')
    } finally {
      inFlight.current = false
      setChecking(false)
    }
  }

  const course = order?.status === 'paid' ? order.courseDetails : null
  const paymentInstructions = initialOrder?.paymentInformation ?? savedInstructions

  async function copyPaymentDetails(value: string) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  const paid = orderStatus === 'paid'
  const expired = orderStatus === 'expired'
  const failed = orderStatus === 'failed'
  const cancelled = orderStatus === 'cancelled'
  const terminalError = expired || failed || cancelled
  const pending = orderStatus === 'pending'
  const courseAccessHref = paid
    ? user
      ? order?.enrollmentExists === true && course?.slug
        ? `/courses/${encodeURIComponent(course.slug)}`
        : undefined
      : `/login?paymentOrderId=${encodeURIComponent(orderId)}`
    : undefined
  const statusLabel = paid
    ? 'Đã thanh toán'
    : pending
      ? 'Đang chờ thanh toán'
      : expired
        ? 'Đã hết hạn'
        : failed
          ? 'Thất bại'
          : cancelled
            ? 'Đã hủy'
            : 'Đang kiểm tra'
  const title = paid
    ? 'Thanh toán thành công!'
    : expired
      ? 'Đơn hàng đã hết hạn'
      : failed
        ? 'Thanh toán chưa thành công'
        : cancelled
          ? 'Bạn đã hủy thanh toán'
            : error || missingOrderInfo
            ? 'Chưa thể xác nhận thanh toán'
            : 'Đơn hàng đang chờ thanh toán'

  return (
    <div className="login-page checkout-page success-page">
      <SiteHeader brandName="Your English Voice" />
      <main className="checkout-success-main checkout-success-missing">
        <section className={`payment-success-empty${paid ? ' is-paid' : ''}${terminalError || error || missingOrderInfo ? ' has-error' : ''}`} aria-live="polite">
          <span className="payment-success-state-icon">
            {paid ? <CheckCircle2 size={32} /> : terminalError ? <XCircle size={32} /> : timedOut || error ? <AlertTriangle size={32} /> : loading || pending ? <Loader2 className="sepay-loader" size={30} /> : <Clock3 size={32} />}
          </span>
          <span className={`payment-success-status-pill${paid ? ' paid' : terminalError ? ' failed' : ''}`}>
            {paid ? 'Đã xác nhận' : pending ? 'Đang chờ thanh toán' : terminalError ? 'Chưa hoàn tất' : 'Đang kiểm tra'}
          </span>
          {!missingOrderInfo && <h1>{timedOut ? 'Chưa xác nhận được thanh toán' : loading || pending ? 'Đang xác nhận thanh toán' : title}</h1>}
          {!missingOrderInfo && <p>
            {paid
              ? `Cảm ơn${user?.fullName ? ` ${user.fullName}` : ''} đã chọn Your English Voice. SePay đã xác nhận thanh toán và đăng ký ${order?.courseTitle ?? 'khóa học'} của bạn đã hoàn tất.`
              : timedOut
                ? 'Hệ thống chưa nhận được xác nhận thanh toán. Nếu bạn đã chuyển khoản, vui lòng liên hệ bộ phận hỗ trợ để được kiểm tra.'
                : expired || failed || cancelled
                ? `${expired ? 'Đơn hàng đã hết hạn.' : failed ? 'SePay chưa xác nhận thanh toán thành công.' : 'Thanh toán đã bị hủy.'} Bạn có thể quay lại khóa học để tạo đơn mới.`
                : error || (missingOrderInfo
                  ? 'Không tìm thấy thông tin đơn hàng. Vui lòng đăng nhập lại hoặc quay lại thanh toán.'
                  : 'Nếu bạn đã thanh toán, vui lòng chờ IPN từ SePay. Trạng thái sẽ tự cập nhật; bạn không cần thanh toán lần nữa.')}
          </p>}
          {order && (
            <div className="payment-success-details">
              <dl className="payment-success-metadata">
                {user?.fullName && <div><dt>Học viên</dt><dd>{user.fullName}</dd></div>}
                <div><dt>Mã đơn hàng</dt><dd title={order.orderId}>{order.orderId}</dd></div>
                <div><dt>Trạng thái</dt><dd className={paid ? 'paid' : ''}>{statusLabel}</dd></div>
                <div><dt>{paid ? 'Thời gian thanh toán' : 'Ngày tạo đơn'}</dt><dd>{formatDateTime(paid && order.paidAt ? order.paidAt : order.createdAt)}</dd></div>
                <div><dt>Tổng tiền</dt><dd className="amount">{formatCurrency(order.amount)}</dd></div>
                <div><dt>Phương thức</dt><dd>{order.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng qua SePay' : order.paymentMethod ?? 'Không có thông tin'}</dd></div>
                <div className="payment-success-reference"><dt>Nội dung chuyển khoản</dt><dd><code>{order.transferContent}</code>
                  <button type="button" onClick={() => void copyPaymentDetails(order.transferContent)} aria-label="Sao chép nội dung chuyển khoản">
                    {copied ? <Check size={15} /> : <FileCheck2 size={15} />}{copied ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </dd></div>
                {paid && order.providerTransactionId && <div><dt>Mã giao dịch SePay</dt><dd>{order.providerTransactionId}</dd></div>}
              </dl>
            </div>
          )}
          {!order && <div className="payment-success-details">
            <dl className="payment-success-metadata">
              <div><dt>Order ID</dt><dd>{orderId}</dd></div>
              {savedInstructions && <>
                <div><dt>Payment method</dt><dd>Bank transfer via SePay</dd></div>
                <div><dt>Amount</dt><dd className="amount">{formatCurrency(savedInstructions.amount)}</dd></div>
                <div className="payment-success-reference"><dt>Transfer content</dt><dd><code>{savedInstructions.transferContent}</code><button type="button" onClick={() => void copyPaymentDetails(savedInstructions.transferContent)}>{copied ? 'Copied' : 'Copy'}</button></dd></div>
              </>}
            </dl>
          </div>}
          {initialOrder && !course && <div className="payment-result-course-summary">
            {initialOrder.course.thumbnailUrl && <img src={initialOrder.course.thumbnailUrl} alt="" />}
            <span><small>Khóa học</small><strong>{initialOrder.course.title}</strong></span>
          </div>}
          {order?.status === 'paid' && (
            <section className="payment-success-course-full" aria-labelledby="purchased-course-heading">
              <div className="payment-success-course-heading">
                <div>
                  <span>KHÓA HỌC ĐÃ THANH TOÁN</span>
                  <h2 id="purchased-course-heading">Thông tin khóa học</h2>
                </div>
                <BookOpen size={22} aria-hidden="true" />
              </div>
              {order.courseDetailsUnavailable && <p className="payment-success-course-state is-error" role="alert">Không thể tải thông tin khóa học lúc này. Bạn có thể thử tải lại trang.</p>}
              {!order.courseDetailsUnavailable && course && (
                <>
                  <div className="payment-success-course-overview">
                    {course.thumbnailUrl && <img src={course.thumbnailUrl} alt={`Ảnh bìa khóa học ${course.title}`} />}
                    <div>
                      <h3>{course.title}</h3>
                      {course.description && <p>{course.description}</p>}
                      <div className="payment-success-course-tags">
                        {course.category && <span><Tag size={14} />{course.category}</span>}
                        {course.level && <span><GraduationCap size={15} />{course.level}</span>}
                        {course.totalLessons > 0 && <span><BookOpen size={14} />{course.totalLessons} bài học</span>}
                      </div>
                      {course.instructor && <div className="payment-success-instructor">
                        {course.instructorAvatarUrl
                          ? <img src={course.instructorAvatarUrl} alt="" />
                          : <span><UserRound size={17} /></span>}
                        <div><small>Giảng viên</small><strong>{course.instructor}</strong></div>
                      </div>}
                    </div>
                  </div>
                  {course.targetAudience && <div className="payment-success-learning-audience"><strong>Đối tượng phù hợp</strong><p>{course.targetAudience}</p></div>}
                  <div className="payment-success-price-summary">
                    {course.originalPrice > 0 && <div><span>Giá niêm yết</span><strong>{formatCurrency(course.originalPrice)}</strong></div>}
                    {course.originalPrice > order.amount && <div><span>Ưu đãi áp dụng</span><strong className="discount">-{formatCurrency(course.originalPrice - order.amount)}</strong></div>}
                    <div className="paid-total"><span>Đã thanh toán</span><strong>{formatCurrency(order.amount)}</strong></div>
                  </div>
                  {course.modules.length > 0 && <div className="payment-success-curriculum">
                    <h3><BookOpen size={17} /> Nội dung chương trình</h3>
                    {course.modules.map((module, index) => <details key={module.id}>
                      <summary><span>{String(index + 1).padStart(2, '0')}</span><strong>{module.title}</strong>{module.lessons.length > 0 && <small>{module.lessons.length} bài học</small>}</summary>
                      {module.description && <p>{module.description}</p>}
                      {module.lessons.length > 0 && <ul>{module.lessons.map((lesson, lessonIndex) => <li key={`${module.id}-${lessonIndex}`}>{lesson}</li>)}</ul>}
                    </details>)}
                  </div>}
                  <p className="payment-success-access"><BadgeCheck size={16} /> Thanh toán đã được xác nhận cho khóa học này.</p>
                </>
              )}
            </section>
          )}
          {error && <p role="alert" className="payment-result-api-error">Không thể cập nhật trạng thái lúc này. Thông tin đơn hàng vẫn được giữ nguyên.</p>}
          {initialOrder?.checkoutMode === 'direct_qr' && initialOrder.paymentInformation && !paid && (
            <section className="payment-result-checkout-info"><h2>Quét mã để thanh toán</h2><img src={initialOrder.paymentInformation.qrCodeUrl} alt="Mã QR chuyển khoản SePay" /><p>{initialOrder.paymentInformation.bankName} · {initialOrder.paymentInformation.accountNumber}</p></section>
          )}
          {initialOrder?.checkoutMode === 'direct_qr' && initialOrder.paymentInformation && !paid && <div className="payment-result-bank-details">
            <p><strong>Bank:</strong> {initialOrder.paymentInformation.bankName}</p>
            <p><strong>Account number:</strong> {initialOrder.paymentInformation.accountNumber}</p>
            <p><strong>Account name:</strong> {initialOrder.paymentInformation.accountName}</p>
            <p><strong>Amount:</strong> {formatCurrency(initialOrder.paymentInformation.amount)}</p>
            <button type="button" className="checkout-secondary-button" onClick={() => void copyPaymentDetails(`Bank: ${initialOrder.paymentInformation!.bankName}\nAccount number: ${initialOrder.paymentInformation!.accountNumber}\nAccount name: ${initialOrder.paymentInformation!.accountName}`)}>Copy bank details</button>
          </div>}
          {!initialOrder && paymentInstructions && !paid && <>
            <section className="payment-result-checkout-info">
              <h2>Payment instructions</h2>
              <img src={paymentInstructions.qrCodeUrl} alt="SePay bank transfer QR code" />
              <p>{paymentInstructions.bankName} · {paymentInstructions.accountNumber}</p>
            </section>
            <div className="payment-result-bank-details">
              <p><strong>Bank:</strong> {paymentInstructions.bankName}</p>
              <p><strong>Account number:</strong> {paymentInstructions.accountNumber}</p>
              <p><strong>Account name:</strong> {paymentInstructions.accountName}</p>
              <p><strong>Amount:</strong> {formatCurrency(paymentInstructions.amount)}</p>
              <button type="button" className="checkout-secondary-button" onClick={() => void copyPaymentDetails(`Bank: ${paymentInstructions.bankName}\nAccount number: ${paymentInstructions.accountNumber}\nAccount name: ${paymentInstructions.accountName}`)}>Copy bank details</button>
            </div>
          </>}
          {initialOrder?.checkoutMode === 'hosted' && initialOrder.checkoutUrl && initialOrder.checkoutFields && !paid && !terminalError && (
            <form action={initialOrder.checkoutUrl} method="POST" className="payment-result-hosted-form">
              {Object.entries(initialOrder.checkoutFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={String(value)} />)}
              <button type="submit" className="checkout-primary-button">Tiếp tục tới SePay <ArrowRight size={16} /></button>
            </form>
          )}
          {paid && order?.enrollmentExists === null && <p className="payment-result-enrollment-pending" role="status">Payment is confirmed. Sign in to verify your course access. <a href={`/login?paymentOrderId=${encodeURIComponent(orderId)}`}>Sign in</a></p>}
          {paid && order?.enrollmentExists === false && <p className="payment-result-enrollment-pending" role="status">Payment is confirmed, but course access is not available yet. Check again or contact support.</p>}
          {(timedOut || terminalError || error) && paymentSupportPhone && <div className="payment-result-support"><span>Mã đơn để được hỗ trợ: <strong>{orderId}</strong></span><a href={`tel:${paymentSupportPhone}`}>Gọi hỗ trợ {paymentSupportPhone}</a></div>}
          {(timedOut || terminalError || error || (pending && !loading) || (paid && order?.enrollmentExists === false)) && <button type="button" className="checkout-secondary-button payment-result-retry" onClick={() => void checkPaymentStatus()} disabled={checking}>{checking ? 'Đang kiểm tra...' : 'Kiểm tra lại thanh toán'}</button>}
          <a className="checkout-primary-button" href={paid ? courseAccessHref : '/courses'} aria-disabled={paid && !courseAccessHref} tabIndex={paid && !courseAccessHref ? -1 : undefined}>
            {paid ? user ? 'Vào học ngay' : 'Đăng nhập để vào học' : terminalError ? 'Chọn khóa học khác' : 'Quay lại khóa học'} <ArrowRight size={16} />
          </a>
        </section>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
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
import { StudentHeader } from '../courses/components/StudentHeader'
import { useAuth } from '../auth/auth-context'
import { sepayApi } from './sepayApi'
import { paymentConfirmationTimeoutMs, paymentPollingIntervalMs, paymentSupportPhone, readPaymentInstructions } from './payment-config'
import { buildCheckoutPageUrl, resolvePaymentBackHref, savePaymentReturnPath, validatePaymentReturnPath } from './payment-navigation'
import type { CreateOrderResponse } from './sepayApi'
import { SePayQrPaymentCard } from './SePayVietQR'
import './checkout-page.css'
import './checkout-success-page.css'

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} ₫`

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không có thông tin'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const isTerminalOrderStatus = (status: string | null | undefined) =>
  ['paid', 'expired', 'failed', 'cancelled'].includes(status ?? '')

export function CheckoutSuccessPage({ initialOrder }: { initialOrder?: CreateOrderResponse }) {
  const orderId = initialOrder?.orderId ?? (typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('orderId') ?? '')
  return <CheckoutSuccessView key={orderId || 'missing-order'} initialOrder={initialOrder} />
}

function CheckoutSuccessView({ initialOrder }: { initialOrder?: CreateOrderResponse }) {
  const { accessToken, user } = useAuth()
  const orderId = initialOrder?.orderId ?? new URLSearchParams(window.location.search).get('orderId') ?? ''
  const search = typeof window === 'undefined' ? '' : window.location.search
  const validatedQueryReturnTo = validatePaymentReturnPath(new URLSearchParams(search).get('returnTo'), user?.role)
  useEffect(() => {
    if (orderId && validatedQueryReturnTo) {
      savePaymentReturnPath(orderId, validatedQueryReturnTo)
    }
  }, [orderId, validatedQueryReturnTo])
  const backHref = resolvePaymentBackHref({
    search,
    storageKey: orderId || undefined,
    userRole: user?.role,
  })
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
  const [loading, setLoading] = useState(() => Boolean(orderId))
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const startedAt = useRef(0)
  const inFlight = useRef(false)
  const currentStatus = useRef<string | null>(initialOrder?.status ?? null)
  const expiresAtRef = useRef<number | null>(
    initialOrder?.expiredAt && Number.isFinite(Date.parse(initialOrder.expiredAt))
      ? Date.parse(initialOrder.expiredAt)
      : savedInstructions?.expiresAt && Number.isFinite(Date.parse(savedInstructions.expiresAt))
        ? Date.parse(savedInstructions.expiresAt)
        : null,
  )
  const missingOrderInfo = !orderId

  useEffect(() => {
    if (missingOrderInfo) return
    startedAt.current = Date.now()
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopWatching: (() => void) | undefined

    const maxWaitElapsed = () => {
      const expiryMs = expiresAtRef.current
      if (expiryMs !== null) {
        return Date.now() > expiryMs + 10_000
      }
      return Date.now() - startedAt.current >= Math.max(paymentConfirmationTimeoutMs, 16 * 60 * 1000)
    }

    const syncPaidUrl = () => {
      try {
        if (window.location.pathname !== '/checkout/success') {
          window.history.replaceState(null, '', `/checkout/success?orderId=${encodeURIComponent(orderId)}`)
        }
      } catch {
        // History replacement is optional.
      }
    }

    const refresh = async () => {
      if (!active || inFlight.current) return
      inFlight.current = true
      try {
        const current = await sepayApi.getOrderStatus(orderId, accessToken)
        if (!active) return
        setOrder(current)
        setOrderStatus(current.status)
        currentStatus.current = current.status
        if (current.expiredAt && Number.isFinite(Date.parse(current.expiredAt))) {
          expiresAtRef.current = Date.parse(current.expiredAt)
        }
        if (current.status === 'paid') {
          syncPaidUrl()
        }
        if (isTerminalOrderStatus(current.status)) stopWatching?.()
        setError('')
        setLoading(false)
        setTimedOut(current.status === 'pending' && maxWaitElapsed())
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra trạng thái đơn hàng.')
        setLoading(false)
      } finally {
        inFlight.current = false
      }
    }

    const poll = () => {
      if (!active) return
      if (isTerminalOrderStatus(currentStatus.current)) return
      if (maxWaitElapsed()) {
        setTimedOut(true)
        return
      }
      timer = setTimeout(() => {
        timer = undefined
        if (isTerminalOrderStatus(currentStatus.current)) return
        void refresh().finally(poll)
      }, paymentPollingIntervalMs)
    }

    stopWatching = accessToken ? sepayApi.watchOrderStatus(orderId, accessToken, (message) => {
      if (!active) return
      if ((message.kind === 'order' && isTerminalOrderStatus(message.status)) || (message.kind === 'connection' && message.status === 'subscribed')) {
        // Events only wake the status API; the API response remains authoritative.
        void refresh()
      }
    }) : undefined

    // Polling starts after the immediate status request settles.
    void refresh().finally(poll)
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      stopWatching?.()
    }
  }, [accessToken, orderId, missingOrderInfo])

  async function checkPaymentStatus() {
    if (!orderId || inFlight.current) return
    inFlight.current = true
    try {
      const current = await sepayApi.getOrderStatus(orderId, accessToken)
      setOrder(current)
      setOrderStatus(current.status)
      currentStatus.current = current.status
      if (current.expiredAt && Number.isFinite(Date.parse(current.expiredAt))) {
        expiresAtRef.current = Date.parse(current.expiredAt)
      }
      if (current.status === 'paid') {
        try {
          if (window.location.pathname !== '/checkout/success') {
            window.history.replaceState(null, '', `/checkout/success?orderId=${encodeURIComponent(orderId)}`)
          }
        } catch {
          // History replacement is optional.
        }
      }
      setError('')
      setTimedOut(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra trạng thái đơn hàng.')
    } finally {
      inFlight.current = false
    }
  }

  const course = order?.status === 'paid' ? order.courseDetails : null
  const paymentInstructions = order?.paymentInformation ?? initialOrder?.paymentInformation ?? savedInstructions

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
  const showQrPaymentCard = !missingOrderInfo && !paid && !terminalError && (pending || Boolean(paymentInstructions))
  const courseAccessHref = paid
    ? user
      ? order?.enrollmentExists === true && course?.slug
        ? `/student/courses/${encodeURIComponent(course.slug)}`
        : undefined
      : `/login?paymentOrderId=${encodeURIComponent(orderId)}`
    : undefined
  const retryCheckoutHref = order?.courseId
    ? buildCheckoutPageUrl(order.courseId, undefined, backHref)
    : backHref
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
            : 'Thanh toán chuyển khoản QR'

  return (
    <div className="login-page checkout-page success-page">
      {user?.role === 'STUDENT' ? (
        <StudentHeader activePage="other-courses" />
      ) : (
        <SiteHeader brandName="Your English Voice" />
      )}
      <main className="checkout-success-main checkout-success-missing">
        <section className={`payment-success-empty${paid ? ' is-paid' : ''}${terminalError || (error && !showQrPaymentCard) || missingOrderInfo ? ' has-error' : ''}`} aria-live="polite">
          <span className="payment-success-state-icon">
            {paid ? <CheckCircle2 size={32} /> : terminalError ? <XCircle size={32} /> : timedOut || (error && !showQrPaymentCard) || missingOrderInfo ? <AlertTriangle size={32} /> : loading && !paymentInstructions ? <Loader2 className="sepay-loader" size={30} /> : <Clock3 size={32} />}
          </span>
          <span className={`payment-success-status-pill${paid ? ' paid' : terminalError || missingOrderInfo ? ' failed' : ''}`}>
            {paid ? 'Đã xác nhận' : showQrPaymentCard ? 'Đang chờ thanh toán' : terminalError ? 'Chưa hoàn tất' : missingOrderInfo ? 'Thiếu thông tin' : 'Đang kiểm tra'}
          </span>
          <h1>{missingOrderInfo ? 'Không tìm thấy mã đơn hàng' : timedOut && !showQrPaymentCard ? 'Chưa xác nhận được thanh toán' : showQrPaymentCard ? 'Thanh toán chuyển khoản QR' : loading ? 'Đang tải thông tin thanh toán' : title}</h1>
          <p>
            {missingOrderInfo
              ? 'Liên kết không chứa mã đơn hàng. Vui lòng kiểm tra lại từ trang thanh toán hoặc danh sách khóa học.'
              : paid
                ? `Cảm ơn${user?.fullName ? ` ${user.fullName}` : ''} đã chọn Your English Voice. SePay đã xác nhận thanh toán và đăng ký ${order?.courseTitle ?? 'khóa học'} của bạn đã hoàn tất.`
                : timedOut
                  ? 'Hệ thống chưa nhận được xác nhận thanh toán. Nếu bạn đã chuyển khoản, vui lòng bấm kiểm tra lại hoặc liên hệ bộ phận hỗ trợ.'
                  : terminalError
                    ? `${expired ? 'Đơn hàng đã hết hạn.' : failed ? 'SePay chưa xác nhận thanh toán thành công.' : 'Thanh toán đã bị hủy.'} Bạn có thể tạo đơn thanh toán mới để tiếp tục.`
                    : showQrPaymentCard
                      ? `Quét mã VietQR hoặc chuyển khoản đúng nội dung${order?.courseTitle ? ` cho khóa học "${order.courseTitle}"` : ''}. Trạng thái đơn hàng sẽ tự động cập nhật sau khi SePay xác nhận giao dịch.`
                      : error || 'Đang tải thông tin đơn hàng từ hệ thống…'}
          </p>

          {showQrPaymentCard && (
            <SePayQrPaymentCard
              orderId={orderId}
              status={orderStatus ?? 'pending'}
              createdAt={order?.createdAt ?? initialOrder?.createdAt ?? null}
              amount={order?.amount ?? initialOrder?.amount ?? paymentInstructions?.amount ?? 0}
              transferContent={order?.transferContent ?? initialOrder?.transferContent ?? paymentInstructions?.transferContent ?? ''}
              expiredAt={order?.expiredAt ?? initialOrder?.expiredAt ?? paymentInstructions?.expiresAt ?? null}
              paymentInformation={paymentInstructions ?? null}
              onCountdownExpired={() => void checkPaymentStatus()}
            />
          )}

          {order && !showQrPaymentCard && (
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
                      {module.lessons.length > 0 && <ul>{module.lessons.map((lesson, lessonIndex) => <li key={`${module.id}-${lessonIndex}`}>{typeof lesson === 'string' ? lesson : lesson.title}</li>)}</ul>}
                    </details>)}
                  </div>}
                  <p className="payment-success-access"><BadgeCheck size={16} /> Thanh toán đã được xác nhận cho khóa học này.</p>
                </>
              )}
            </section>
          )}
          {error && <p role="alert" className="payment-result-api-error">Không thể cập nhật trạng thái lúc này. Thông tin đơn hàng vẫn được giữ nguyên.</p>}
          {paid && order?.enrollmentExists === null && <p className="payment-result-enrollment-pending" role="status">Thanh toán đã được xác nhận. Vui lòng đăng nhập để truy cập khóa học. <a href={`/login?paymentOrderId=${encodeURIComponent(orderId)}`}>Đăng nhập</a></p>}
          {paid && order?.enrollmentExists === false && <p className="payment-result-enrollment-pending" role="status">Thanh toán đã được xác nhận nhưng quyền truy cập khóa học chưa hiển thị. Vui lòng bấm kiểm tra lại hoặc liên hệ hỗ trợ.</p>}
          {(timedOut || terminalError || error) && paymentSupportPhone && <div className="payment-result-support"><span>Mã đơn để được hỗ trợ: <strong>{orderId}</strong></span><a href={`tel:${paymentSupportPhone}`}>Gọi hỗ trợ {paymentSupportPhone}</a></div>}
          <a className="checkout-primary-button" href={paid ? courseAccessHref : terminalError ? retryCheckoutHref : backHref} aria-disabled={paid && !courseAccessHref} tabIndex={paid && !courseAccessHref ? -1 : undefined}>
            {paid ? user ? 'Vào học ngay' : 'Đăng nhập để vào học' : terminalError ? 'Tạo đơn thanh toán mới' : 'Quay lại trang khóa học'} 
          </a>
        </section>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ArrowRight, Check, CheckCircle2, Clock3, FileCheck2, Loader2, XCircle } from 'lucide-react'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { useAuth } from '../auth/auth-context'
import { courseCatalogApi } from '../courses/services/courseCatalogApi'
import type { CourseReference } from '../courses/course-data'
import { sepayApi } from './sepayApi'
import './checkout-page.css'
import './checkout-success-page.css'

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} ₫`

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không có thông tin'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function CheckoutSuccessPage() {
  const { accessToken, user } = useAuth()
  const orderId = new URLSearchParams(window.location.search).get('orderId') ?? ''
  const [order, setOrder] = useState<Awaited<ReturnType<typeof sepayApi.getOrderStatus>> | null>(null)
  const [orderStatus, setOrderStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [course, setCourse] = useState<CourseReference | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const missingOrderInfo = !accessToken || !orderId

  useEffect(() => {
    if (missingOrderInfo) return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopWatching: (() => void) | undefined
    let requestInFlight = false
    let refreshRequested = false
    let terminal = false
    let latestStatus: string | undefined
    const scheduleFallback = () => {
      if (!active || terminal || timer) return
      timer = setTimeout(() => {
        timer = undefined
        void refresh()
      }, 1500)
    }
    const refresh = async () => {
      if (!active || terminal) return
      if (requestInFlight) {
        refreshRequested = true
        return
      }
      requestInFlight = true
      try {
        const current = await sepayApi.getOrderStatus(orderId, accessToken)
        if (!active) return
        if (latestStatus === 'paid' && current.status !== 'paid') return
        latestStatus = current.status
        setOrder(current)
        setOrderStatus(current.status)
        setError('')
        setLoading(false)
        terminal = current.status === 'paid' || ['expired', 'failed', 'cancelled'].includes(current.status)
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra trạng thái đơn hàng.')
        setLoading(false)
      } finally {
        requestInFlight = false
        if (refreshRequested && active && !terminal) {
          refreshRequested = false
          queueMicrotask(() => void refresh())
        } else {
          scheduleFallback()
        }
      }
    }
    // Start the authorized snapshot and stream together. When Realtime reports
    // ready it triggers another snapshot, closing the subscribe/read race.
    void refresh()
    stopWatching = sepayApi.watchOrderStatus(orderId, accessToken, (message) => {
      if (!active) return
      if (message.kind === 'connection') {
        if (message.status === 'subscribed') void refresh()
        scheduleFallback()
        return
      }
      if (message.status === 'paid') {
        // This authenticated backend event follows the verified webhook's
        // database update. Keep paid monotonic if an older snapshot is in flight.
        latestStatus = 'paid'
        setOrderStatus('paid')
        setError('')
        setLoading(false)
        void refresh()
      } else if (['expired', 'failed', 'cancelled'].includes(message.status)) {
        void refresh()
      }
    })
    scheduleFallback()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      stopWatching?.()
    }
  }, [accessToken, orderId, missingOrderInfo])

  useEffect(() => {
    if (!order?.courseId) return
    let active = true
    void courseCatalogApi.get(order.courseId)
      .then((record) => { if (active) setCourse(record) })
      .catch(() => { if (active) setCourse(null) })
    return () => { active = false }
  }, [order?.courseId])

  async function copyTransferDescription() {
    if (!order?.transferContent) return
    try {
      await navigator.clipboard.writeText(order.transferContent)
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
            : 'Đang chờ xác nhận thanh toán'

  return (
    <div className="login-page checkout-page success-page">
      <SiteHeader brandName="Your English Voice" />
      <main className="checkout-success-main checkout-success-missing">
        {loading && !missingOrderInfo ? (
          <section className="payment-success-empty" role="status" aria-live="polite">
            <span className="payment-success-state-icon"><Loader2 className="sepay-loader" size={28} /></span>
            <h1>Đang tải thông tin đơn hàng...</h1>
          </section>
        ) : (
        <section className={`payment-success-empty${paid ? ' is-paid' : ''}${terminalError || error || missingOrderInfo ? ' has-error' : ''}`} aria-live="polite">
          <span className="payment-success-state-icon">
            {paid ? <CheckCircle2 size={32} /> : terminalError || error ? <XCircle size={32} /> : <Clock3 size={32} />}
          </span>
          <span className={`payment-status-pill${paid ? ' paid' : terminalError ? ' failed' : ''}`}>
            {paid ? 'Đã xác nhận' : pending ? 'Đang chờ thanh toán' : terminalError ? 'Chưa hoàn tất' : 'Đang kiểm tra'}
          </span>
          <h1>{title}</h1>
          <p>
            {paid
              ? `Cảm ơn${user?.fullName ? ` ${user.fullName}` : ''} đã chọn Your English Voice. SePay đã xác nhận thanh toán và đăng ký ${order?.courseTitle ?? 'khóa học'} của bạn đã hoàn tất.`
              : expired || failed || cancelled
                ? `${expired ? 'Đơn hàng đã hết hạn.' : failed ? 'SePay chưa xác nhận thanh toán thành công.' : 'Thanh toán đã bị hủy.'} Bạn có thể quay lại khóa học để tạo đơn mới.`
                : error || (missingOrderInfo
                  ? 'Không tìm thấy thông tin đơn hàng. Vui lòng đăng nhập lại hoặc quay lại thanh toán.'
                  : 'Nếu bạn đã thanh toán, vui lòng chờ IPN từ SePay. Trạng thái sẽ tự cập nhật; bạn không cần thanh toán lần nữa.')}
          </p>
          {order && (
            <div className="payment-success-details">
              <div className="payment-success-course">
                {course?.thumbnailUrl
                  ? <img src={course.thumbnailUrl} alt="" />
                  : <span className="payment-success-course-fallback"><FileCheck2 size={22} /></span>}
                <div><small>Khóa học</small><strong>{order.courseTitle ?? course?.title ?? order.courseId}</strong></div>
              </div>
              <dl className="payment-success-metadata">
                {user?.fullName && <div><dt>Học viên</dt><dd>{user.fullName}</dd></div>}
                <div><dt>Mã đơn hàng</dt><dd title={order.orderId}>{order.orderId}</dd></div>
                <div><dt>Trạng thái</dt><dd className={paid ? 'paid' : ''}>{statusLabel}</dd></div>
                <div><dt>{paid ? 'Thời gian thanh toán' : 'Ngày tạo đơn'}</dt><dd>{formatDateTime(paid && order.paidAt ? order.paidAt : order.createdAt)}</dd></div>
                <div><dt>Tổng tiền</dt><dd className="amount">{formatCurrency(order.amount)}</dd></div>
                <div><dt>Phương thức</dt><dd>{order.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng qua SePay' : order.paymentMethod ?? 'Không có thông tin'}</dd></div>
                <div className="payment-success-reference"><dt>Nội dung chuyển khoản</dt><dd><code>{order.transferContent}</code>
                  <button type="button" onClick={() => void copyTransferDescription()} aria-label="Sao chép nội dung chuyển khoản">
                    {copied ? <Check size={15} /> : <FileCheck2 size={15} />}{copied ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </dd></div>
              </dl>
            </div>
          )}
          <a className="checkout-primary-button" href={paid && course?.slug ? `/courses/${encodeURIComponent(course.slug)}` : '/courses'}>
            {paid ? 'Vào học ngay' : terminalError ? 'Chọn khóa học khác' : 'Quay lại khóa học'} <ArrowRight size={16} />
          </a>
        </section>
        )}
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}

import { useEffect, useState } from 'react'
import { ArrowRight, Check, CheckCircle2, Clock3, FileCheck2, XCircle } from 'lucide-react'
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
  const { accessToken } = useAuth()
  const orderId = new URLSearchParams(window.location.search).get('orderId') ?? ''
  const [order, setOrder] = useState<Awaited<ReturnType<typeof sepayApi.getOrderStatus>> | null>(null)
  const [course, setCourse] = useState<CourseReference | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!accessToken || !orderId) {
      setError('Không tìm thấy thông tin đơn hàng. Vui lòng đăng nhập lại hoặc quay lại thanh toán.')
      return
    }
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      try {
        const current = await sepayApi.getOrderStatus(orderId, accessToken)
        if (!active) return
        setOrder(current)
        if (current.status === 'pending') timer = setTimeout(refresh, 4000)
      } catch (cause) {
        if (!active) return
        setError(cause instanceof Error ? cause.message : 'Không thể kiểm tra trạng thái đơn hàng.')
      }
    }
    void refresh()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
    }
  }, [accessToken, orderId])

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

  const paid = order?.status === 'paid'
  const expired = order?.status === 'expired'
  const failed = order?.status === 'failed'
  const cancelled = order?.status === 'cancelled'
  const terminalError = expired || failed || cancelled
  const pending = order?.status === 'pending'
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
    ? 'Thanh toán thành công'
    : expired
      ? 'Đơn hàng đã hết hạn'
      : failed
        ? 'Thanh toán chưa thành công'
        : cancelled
          ? 'Bạn đã hủy thanh toán'
          : error
            ? 'Chưa thể xác nhận thanh toán'
            : 'Đang chờ xác nhận thanh toán'

  return (
    <div className="login-page checkout-page success-page">
      <SiteHeader brandName="Your English Voice" />
      <main className="checkout-success-main checkout-success-missing">
        <section className={`payment-success-empty${paid ? ' is-paid' : ''}${terminalError || error ? ' has-error' : ''}`} aria-live="polite">
          <span className="payment-success-state-icon">
            {paid ? <CheckCircle2 size={32} /> : terminalError || error ? <XCircle size={32} /> : <Clock3 size={32} />}
          </span>
          <span className={`payment-status-pill${paid ? ' paid' : terminalError ? ' failed' : ''}`}>
            {paid ? 'Đã xác nhận' : pending ? 'Đang chờ thanh toán' : terminalError ? 'Chưa hoàn tất' : 'Đang kiểm tra'}
          </span>
          <h1>{title}</h1>
          <p>
            {paid
              ? `SePay đã xác nhận giao dịch. ${order?.courseTitle ?? 'Khóa học'} đã được kích hoạt cho tài khoản của bạn.`
              : expired || failed || cancelled
                ? `${expired ? 'Đơn hàng đã hết hạn.' : failed ? 'SePay chưa xác nhận thanh toán thành công.' : 'Thanh toán đã bị hủy.'} Bạn có thể quay lại khóa học để tạo đơn mới.`
                : error || 'Nếu bạn đã thanh toán, vui lòng chờ IPN từ SePay. Trạng thái sẽ tự cập nhật; bạn không cần thanh toán lần nữa.'}
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
                <div><dt>Mã đơn hàng</dt><dd title={order.orderId}>{order.orderId.slice(0, 8)}…{order.orderId.slice(-4)}</dd></div>
                <div><dt>Trạng thái</dt><dd className={paid ? 'paid' : ''}>{statusLabel}</dd></div>
                <div><dt>Ngày tạo</dt><dd>{formatDateTime(order.createdAt)}</dd></div>
                <div><dt>Tổng tiền</dt><dd className="amount">{formatCurrency(order.amount)}</dd></div>
                <div className="payment-success-reference"><dt>Nội dung chuyển khoản</dt><dd><code>{order.transferContent}</code>
                  <button type="button" onClick={() => void copyTransferDescription()} aria-label="Sao chép nội dung chuyển khoản">
                    {copied ? <Check size={15} /> : <FileCheck2 size={15} />}{copied ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </dd></div>
              </dl>
            </div>
          )}
          <a className="checkout-primary-button" href="/courses">
            {paid ? 'Đi đến khóa học' : terminalError ? 'Chọn khóa học khác' : 'Quay lại khóa học'} <ArrowRight size={16} />
          </a>
        </section>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}

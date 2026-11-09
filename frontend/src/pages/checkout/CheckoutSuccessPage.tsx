import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, XCircle } from 'lucide-react'
import { SiteFooter, SiteHeader } from '../auth/AuthShared'
import { useAuth } from '../auth/auth-context'
import { sepayApi } from './sepayApi'
import './checkout-page.css'
import './checkout-success-page.css'

const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} đ`

export function CheckoutSuccessPage() {
  const { accessToken } = useAuth()
  const orderId = new URLSearchParams(window.location.search).get('orderId') ?? ''
  const [order, setOrder] = useState<Awaited<ReturnType<typeof sepayApi.getOrderStatus>> | null>(null)
  const [error, setError] = useState('')

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

  const paid = order?.status === 'paid'
  const terminalError = order && ['expired', 'failed', 'cancelled'].includes(order.status)

  return (
    <div className="login-page checkout-page success-page">
      <SiteHeader brandName="Your English Voice" />
      <main className="checkout-success-main checkout-success-missing">
        <section className="payment-success-empty" aria-live="polite">
          {paid ? <CheckCircle2 size={40} /> : terminalError || error ? <XCircle size={40} /> : <Clock3 size={40} />}
          <h1>{paid ? 'Thanh toán thành công' : terminalError ? 'Đơn hàng không còn hiệu lực' : error ? 'Chưa thể xác nhận thanh toán' : 'Đang xác nhận thanh toán'}</h1>
          <p>
            {paid
              ? `SePay đã xác nhận giao dịch. Khóa học ${order?.courseTitle ?? ''} đã được kích hoạt.`
              : terminalError
                ? 'Đơn hàng không còn hiệu lực. Vui lòng quay lại trang khóa học để tạo đơn mới.'
                : error || 'Đang chờ thông báo IPN xác nhận từ SePay. Trang này tự cập nhật trạng thái.'}
          </p>
          {order && (
            <div className="payment-success-metadata">
              <div><FileCheck2 size={17} /><span><small>Mã đơn hàng</small><strong>{order.orderId}</strong></span></div>
              <div><span><small>Khóa học</small><strong>{order.courseTitle ?? order.courseId}</strong></span></div>
              <div><span><small>Số tiền</small><strong>{formatCurrency(order.amount)}</strong></span></div>
              <div><span><small>Nội dung chuyển khoản</small><strong>{order.transferContent}</strong></span></div>
            </div>
          )}
          <a className="checkout-primary-button" href={paid ? '/courses' : '/checkout'}>
            {paid ? 'Khám phá khóa học' : 'Quay lại thanh toán'} <ArrowRight size={16} />
          </a>
        </section>
      </main>
      <SiteFooter brandName="Your English Voice" />
    </div>
  )
}

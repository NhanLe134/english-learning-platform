import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Clipboard, ExternalLink, Loader2 } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { sepayApi } from './sepayApi'

interface SePayVietQRProps {
  courseId: string
  onPaymentError: (message: string) => void
  onOrderReady: () => void
}

/** Creates an order locally, then submits the signed form to SePay's hosted checkout.
 * SePay renders its official environment-specific checkout there; the browser must post the
 * signed fields (a JSON fetch cannot initialize checkout).
 */
const formatCurrency = (amount: number) => `${amount.toLocaleString('vi-VN')} ₫`

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không có thông tin'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function SePayVietQR({ courseId, onPaymentError, onOrderReady }: SePayVietQRProps) {
  const { accessToken } = useAuth()
  const [order, setOrder] = useState<Awaited<ReturnType<typeof sepayApi.createOrder>> | null>(null)
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const orderRequestRef = useRef<ReturnType<typeof sepayApi.createOrder> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    if (!accessToken) {
      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      return () => { active = false }
    }
    orderRequestRef.current ??= sepayApi.createOrder({ courseId }, accessToken)
    void orderRequestRef.current
      .then((order) => {
        if (!active) return
        setOrder(order)
        onOrderReady()
      })
      .catch((cause: unknown) => {
        if (!active) return
        const message = cause instanceof Error ? cause.message : 'Không thể tạo đơn thanh toán.'
        setError(message)
        onPaymentError(message)
      })
    return () => { active = false }
  }, [accessToken, courseId, onOrderReady, onPaymentError])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  async function copyTransferDescription() {
    if (!order) return
    try {
      await navigator.clipboard.writeText(order.transferContent)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('error')
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 3000)
  }

  if (error) return <div className="sepay-vietqr pay-error" role="alert"><AlertCircle size={20} /> {error}</div>
  if (!order) return <div className="sepay-vietqr pay-waiting" role="status"><Loader2 className="sepay-loader" size={22} /> Đang tạo đơn thanh toán…</div>

  return (
    <section className="sepay-order-card" aria-labelledby="sepay-order-title">
      <header className="sepay-order-heading">
        <span className="sepay-order-icon"><Check size={17} /></span>
        <div>
          <h3 id="sepay-order-title">Đơn hàng đã sẵn sàng</h3>
          <p>Trạng thái: <strong>Đang chờ thanh toán</strong></p>
        </div>
      </header>

      <dl className="sepay-order-meta">
        <div><dt>Mã đơn hàng</dt><dd title={order.orderId}>{order.orderId.slice(0, 8)}…{order.orderId.slice(-4)}</dd></div>
        <div><dt>Ngày tạo</dt><dd>{formatCreatedAt(order.createdAt)}</dd></div>
        <div className="sepay-order-total"><dt>Số tiền cần chuyển</dt><dd>{formatCurrency(order.amount)}</dd></div>
      </dl>

      <div className="sepay-transfer-reference">
        <span>Nội dung chuyển khoản chính xác</span>
        <div>
          <code>{order.transferContent}</code>
          <button type="button" onClick={() => void copyTransferDescription()} aria-label="Sao chép nội dung chuyển khoản">
            {copyStatus === 'copied' ? <Check size={16} /> : <Clipboard size={16} />}
            {copyStatus === 'copied' ? 'Đã sao chép' : 'Sao chép nội dung'}
          </button>
        </div>
        <p aria-live="polite">
          {copyStatus === 'error'
            ? 'Không thể tự sao chép. Vui lòng chọn và sao chép nội dung ở trên.'
            : 'Vui lòng nhập chính xác nội dung này để hệ thống tự động nhận diện và xác nhận giao dịch. Không dùng mã đơn hàng thay thế.'}
        </p>
      </div>

      <div className="sepay-hosted-checkout-note">
        <strong>QR động và thông tin ngân hàng</strong>
        <p>SePay sẽ hiển thị mã QR của đơn hàng cùng thông tin người nhận trên trang thanh toán tiếp theo.</p>
        <p>Use your banking app or a digital wallet that supports VietQR to scan and complete the payment.</p>
      </div>

      <form ref={formRef} action={order.checkoutUrl} method="POST" className="sepay-checkout-form">
        {Object.entries(order.checkoutFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
        ))}
        <button type="submit" className="checkout-primary-button sepay-continue-button">
          Tiếp tục tới SePay <ExternalLink size={16} />
        </button>
      </form>
    </section>
  )
}

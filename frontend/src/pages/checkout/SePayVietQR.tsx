import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, CheckCircle2, Clipboard, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { sepayApi, type CreateOrderResponse } from './sepayApi'

interface SePayVietQRProps {
  courseId: string
  onPaymentError: (message: string) => void
  onOrderReady: (order: CreateOrderResponse) => void
  onOrderStatusChange: (status: string) => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(amount)
}

function formatCreatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không có thông tin'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

const isTerminalStatus = (status: string) => ['paid', 'expired', 'failed', 'cancelled'].includes(status)

export default function SePayVietQR({ courseId, onPaymentError, onOrderReady, onOrderStatusChange }: SePayVietQRProps) {
  const { accessToken } = useAuth()
  const [order, setOrder] = useState<CreateOrderResponse | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('pending')
  const [copyStatus, setCopyStatus] = useState<'idle' | 'account' | 'description' | 'error'>('idle')
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [qrImageError, setQrImageError] = useState(false)
  const orderRequestRef = useRef<ReturnType<typeof sepayApi.createOrder> | null>(null)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiryCheckedRef = useRef(false)
  const orderStatusRef = useRef('pending')

  useEffect(() => { orderStatusRef.current = status }, [status])

  useEffect(() => {
    let active = true
    if (!accessToken) {
      onPaymentError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      return () => { active = false }
    }
    orderRequestRef.current ??= sepayApi.createOrder({ courseId }, accessToken)
    void orderRequestRef.current
      .then((createdOrder) => {
        if (!active) return
        setOrder(createdOrder)
        orderStatusRef.current = createdOrder.status
        setStatus(createdOrder.status)
        onOrderStatusChange(createdOrder.status)
        onOrderReady(createdOrder)
      })
      .catch((cause: unknown) => {
        if (!active) return
        const message = cause instanceof Error ? cause.message : 'Không thể tạo đơn thanh toán.'
        setError(message)
        onPaymentError(message)
      })
    return () => { active = false }
  }, [accessToken, courseId, onOrderReady, onOrderStatusChange, onPaymentError])

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!order?.expiredAt || order.checkoutMode !== 'direct_qr') return
    expiryCheckedRef.current = false
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(order.expiredAt!) - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining === 0 && !expiryCheckedRef.current && accessToken) {
        expiryCheckedRef.current = true
        void sepayApi.getOrderStatus(order.orderId, accessToken)
          .then((current) => {
            const verifiedStatus = orderStatusRef.current === 'paid' ? 'paid' : current.status
            orderStatusRef.current = verifiedStatus
            setStatus(verifiedStatus)
            onOrderStatusChange(verifiedStatus)
          })
          .catch(() => undefined)
      }
    }
    updateCountdown()
    const interval = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(interval)
  }, [accessToken, onOrderStatusChange, order?.checkoutMode, order?.expiredAt, order?.orderId])

  const orderId = order?.orderId
  const checkoutMode = order?.checkoutMode
  useEffect(() => {
    if (!orderId || checkoutMode !== 'direct_qr' || !accessToken || isTerminalStatus(status)) return
    let active = true
    let connected = false
    let inFlight = false
    let refreshQueued = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      if (!active || isTerminalStatus(status)) return
      if (inFlight) {
        refreshQueued = true
        return
      }
      inFlight = true
      let requestFailed = false
      try {
        const current = await sepayApi.getOrderStatus(orderId, accessToken)
        if (active) {
          const verifiedStatus = orderStatusRef.current === 'paid' ? 'paid' : current.status
          orderStatusRef.current = verifiedStatus
          setStatus(verifiedStatus)
          onOrderStatusChange(verifiedStatus)
        }
      } catch {
        // Continue listening and retry via the fallback timer when needed.
        requestFailed = true
      } finally {
        inFlight = false
        if (refreshQueued && active) {
          refreshQueued = false
          queueMicrotask(() => void refresh())
        } else if (active && (!connected || requestFailed) && !isTerminalStatus(status) && !timer) {
          timer = setTimeout(() => { timer = undefined; void refresh() }, 1500)
        }
      }
    }
    const stopWatching = sepayApi.watchOrderStatus(orderId, accessToken, (message) => {
      if (!active) return
      if (message.kind === 'connection') {
        connected = message.status === 'subscribed'
        if (timer) { clearTimeout(timer); timer = undefined }
        if (connected) void refresh()
        else if (!isTerminalStatus(status) && !timer) timer = setTimeout(() => { timer = undefined; void refresh() }, 1500)
      } else if (isTerminalStatus(message.status)) {
        void refresh()
      }
    })
    void refresh()
    return () => {
      active = false
      if (timer) clearTimeout(timer)
      stopWatching()
    }
  }, [accessToken, checkoutMode, onOrderStatusChange, orderId, status])

  async function copyValue(value: string, kind: 'account' | 'description') {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(kind)
    } catch {
      setCopyStatus('error')
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2500)
  }

  const visibleError = error || (!accessToken ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : '')
  if (visibleError) return <div className="sepay-vietqr pay-error" role="alert"><AlertCircle size={20} /> {visibleError}</div>
  if (!order) return <div className="sepay-vietqr pay-waiting" role="status"><Loader2 className="sepay-loader" size={22} /> Đang tạo đơn thanh toán…</div>
  if (order.checkoutMode === 'direct_qr' && !order.paymentInformation) {
    return <div className="sepay-vietqr pay-error" role="alert"><AlertCircle size={20} /> Thiếu thông tin nhận thanh toán. Vui lòng liên hệ bộ phận hỗ trợ trước khi chuyển tiền.</div>
  }

  if (order.checkoutMode === 'direct_qr' && order.paymentInformation) {
    const payment = order.paymentInformation
    const paid = status === 'paid'
    const expired = status === 'expired'
    const failed = status === 'failed' || status === 'cancelled'
    const accountText = `Ngân hàng: ${payment.bankName}\nSố tài khoản: ${payment.accountNumber}\nChủ tài khoản: ${payment.accountName}`

    return (
      <section className="sepay-order-card sepay-custom-qr" aria-labelledby="sepay-custom-title" aria-live="polite">
        <header className="sepay-order-heading">
          <span className={`sepay-order-icon${paid ? ' is-paid' : ''}`}>
            {paid ? <CheckCircle2 size={18} /> : failed || expired ? <XCircle size={18} /> : <Check size={17} />}
          </span>
          <div>
            <h3 id="sepay-custom-title">{paid ? 'Thanh toán thành công' : expired ? 'Đơn hàng đã hết hạn' : failed ? 'Thanh toán chưa hoàn tất' : 'Quét mã QR để thanh toán'}</h3>
            <p>Trạng thái: <strong className={paid ? 'is-paid' : ''}>{paid ? 'Đã xác nhận' : expired ? 'Đã hết hạn' : failed ? 'Chưa hoàn tất' : 'Đang chờ thanh toán'}</strong></p>
          </div>
        </header>

        <div className="sepay-custom-qr-layout">
          <div className="sepay-custom-qr-panel">
  {paid ? (
    <div className="sepay-payment-result is-paid">
      <CheckCircle2 size={42} />
      <strong>SePay đã xác nhận giao dịch</strong>
      <span>Khóa học đã được kích hoạt cho tài khoản của bạn.</span>
    </div>
  ) : expired || failed ? (
    <div className="sepay-payment-result">
      <XCircle size={42} />
      <strong>{expired ? 'Đơn hàng đã hết hạn' : 'Thanh toán chưa hoàn tất'}</strong>
      <span>Vui lòng tạo đơn mới để tiếp tục.</span>
    </div>
  ) : qrImageError ? (
    <div className="sepay-qr-image-fallback" role="status">
      Không tải được mã QR. Bạn vẫn có thể sử dụng thông tin chuyển khoản ở bên cạnh.
    </div>
  ) : (
    <img 
      className="sepay-custom-qr-image" 
      src={payment.qrCodeUrl} 
      alt={`Mã VietQR thanh toán ${formatCurrency(payment.amount)} tới ${payment.accountName}`} 
      onError={() => setQrImageError(true)} 
    />
  )}

  <strong className="sepay-custom-qr-amount">{formatCurrency(payment.amount)}</strong>

  {!paid && !expired && !failed && (
    <p>Mở ứng dụng ngân hàng bất kỳ để quét mã và thanh toán tự động.</p>
  )}

  {status === 'pending' && (
    <span className={`sepay-payment-countdown${remainingSeconds <= 60 ? ' is-urgent' : ''}`}>
      <span>Đơn hết hạn sau</span>
      <b>{formatCountdown(remainingSeconds)}</b>
    </span>
  )}
          </div>

          <div className="sepay-custom-transfer-details">
            <dl className="sepay-order-meta">
              <div><dt>Mã đơn hàng</dt><dd title={order.orderId}>{order.orderId}</dd></div>
              <div><dt>Ngày tạo</dt><dd>{formatCreatedAt(order.createdAt)}</dd></div>
              <div><dt>Ngân hàng</dt><dd>{payment.bankName}</dd></div>
              <div><dt>Số tài khoản</dt><dd>{payment.accountNumber}</dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{payment.accountName}</dd></div>
            </dl>
            <button type="button" className="sepay-copy-details-button" onClick={() => void copyValue(accountText, 'account')}>
              {copyStatus === 'account' ? <Check size={16} /> : <Clipboard size={16} />}
              {copyStatus === 'account' ? 'Đã sao chép thông tin' : 'Sao chép thông tin tài khoản'}
            </button>
            <div className="sepay-transfer-reference">
              <span>Nội dung chuyển khoản chính xác</span>
              <div>
                <code>{payment.transferContent}</code>
                <button type="button" onClick={() => void copyValue(payment.transferContent, 'description')} aria-label="Sao chép nội dung chuyển khoản">
                  {copyStatus === 'description' ? <Check size={16} /> : <Clipboard size={16} />}
                  {copyStatus === 'description' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p>Chuyển đúng số tiền và giữ nguyên nội dung trên để hệ thống nhận diện đơn hàng.</p>
            </div>
            <ol className="sepay-payment-instructions">
              <li>Mở ứng dụng ngân hàng và quét mã QR.</li>
              <li>Kiểm tra người nhận, số tiền và nội dung chuyển khoản.</li>
              <li>Xác nhận chuyển tiền; trạng thái sẽ cập nhật tự động sau khi SePay gửi thông báo đã xác thực.</li>
            </ol>
            <p className="sepay-copy-feedback" aria-live="polite">
              {copyStatus === 'error' ? 'Không thể sao chép tự động. Vui lòng chọn và sao chép nội dung thủ công.' : ''}
            </p>
          </div>
        </div>
      </section>
    )
  }

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
          <button type="button" onClick={() => void copyValue(order.transferContent, 'description')} aria-label="Sao chép nội dung chuyển khoản">
            {copyStatus === 'description' ? <Check size={16} /> : <Clipboard size={16} />}
            {copyStatus === 'description' ? 'Đã sao chép' : 'Sao chép nội dung'}
          </button>
        </div>
        <p>Vui lòng nhập chính xác nội dung này để hệ thống tự động nhận diện và xác nhận giao dịch.</p>
      </div>

      <div className="sepay-hosted-checkout-note">
        <strong>Thanh toán bảo mật qua SePay</strong>
        <p>Tiếp tục tới trang SePay để hoàn tất thanh toán bằng phương thức đã chọn.</p>
      </div>

      {order.checkoutUrl && order.checkoutFields && <form action={order.checkoutUrl} method="POST" className="sepay-checkout-form">
        {Object.entries(order.checkoutFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={String(value)} />
        ))}
        <button type="submit" className="checkout-primary-button sepay-continue-button">
          Tiếp tục tới SePay <ExternalLink size={16} />
        </button>
      </form>}
    </section>
  )
}

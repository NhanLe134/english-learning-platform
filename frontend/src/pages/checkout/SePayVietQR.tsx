import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, Clipboard, QrCode } from 'lucide-react'
import type { CreateOrderResponse } from './sepayApi'

export interface SePayQrPaymentCardProps {
  orderId: string
  status: string
  createdAt: string | null
  amount: number
  transferContent: string
  expiredAt: string | null
  paymentInformation: CreateOrderResponse['paymentInformation']
  onCountdownExpired?: () => void
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCreatedAt(value: string | null): string {
  if (!value) return 'Đang cập nhật…'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Không có thông tin'
    : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatCountdown(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
}

function PaymentCountdown({ expiresAt, onExpired }: { expiresAt: string; onExpired?: () => void }) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => {
    const target = Date.parse(expiresAt)
    return Number.isFinite(target) ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0
  })
  const expiredNotifiedRef = useRef(false)

  useEffect(() => {
    const target = Date.parse(expiresAt)
    if (!Number.isFinite(target)) return
    if (remainingSeconds <= 0) {
      if (!expiredNotifiedRef.current) {
        expiredNotifiedRef.current = true
        onExpired?.()
      }
      return
    }
    const timer = window.setTimeout(() => {
      setRemainingSeconds(Math.max(0, Math.ceil((target - Date.now()) / 1000)))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [expiresAt, onExpired, remainingSeconds])

  return (
    <span className={`sepay-payment-countdown${remainingSeconds <= 60 ? ' is-urgent' : ''}`} role="timer">
      <span>Đơn hết hạn sau</span>
      <b>{formatCountdown(remainingSeconds)}</b>
    </span>
  )
}

export function SePayQrPaymentCard({
  orderId,
  status,
  createdAt,
  amount,
  transferContent,
  expiredAt,
  paymentInformation,
  onCountdownExpired,
}: SePayQrPaymentCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'account' | 'description' | 'error'>('idle')
  const [qrImageError, setQrImageError] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  async function copyValue(value: string, kind: 'account' | 'description') {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(kind)
    } catch {
      setCopyStatus('error')
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopyStatus('idle'), 2500)
  }

  const displayAmount = paymentInformation?.amount ?? amount
  const displayTransferContent = paymentInformation?.transferContent || transferContent
  const displayExpiresAt = paymentInformation?.expiresAt || expiredAt
  const statusLabel = status === 'pending' ? 'Đang chờ thanh toán' : 'Đang kiểm tra'
  const accountText = paymentInformation
    ? `Ngân hàng: ${paymentInformation.bankName}\nSố tài khoản: ${paymentInformation.accountNumber}\nChủ tài khoản: ${paymentInformation.accountName}`
    : ''

  return (
    <section className="sepay-order-card sepay-custom-qr" aria-labelledby="sepay-custom-title" aria-live="polite">
      <header className="sepay-order-heading">
        <span className="sepay-order-icon">
          <QrCode size={18} />
        </span>
        <div>
          <h3 id="sepay-custom-title">Quét mã QR để thanh toán</h3>
        </div>
      </header>

      <div className="sepay-custom-qr-layout">
        <div className="sepay-custom-qr-panel">
          {!paymentInformation ? (
            <div className="sepay-qr-image-fallback" role="alert">
              <AlertCircle size={22} />
              <span>Chưa cấu hình thông tin tài khoản nhận thanh toán SePay. Vui lòng liên hệ bộ phận hỗ trợ trước khi chuyển tiền.</span>
            </div>
          ) : qrImageError ? (
            <div className="sepay-qr-image-fallback" role="status">
              Không tải được ảnh mã QR. Bạn vẫn có thể sử dụng thông tin chuyển khoản ở bên cạnh.
            </div>
          ) : (
            <img
              className="sepay-custom-qr-image"
              src={paymentInformation.qrCodeUrl}
              alt={`Mã VietQR thanh toán ${formatCurrency(displayAmount)} tới ${paymentInformation.accountName || paymentInformation.accountNumber}`}
              onError={() => setQrImageError(true)}
            />
          )}

          <strong className="sepay-custom-qr-amount">{formatCurrency(displayAmount)}</strong>
          <p>Mở ứng dụng ngân hàng bất kỳ để quét mã và thanh toán tự động.</p>

          {status === 'pending' && displayExpiresAt && (
            <PaymentCountdown
              key={displayExpiresAt}
              expiresAt={displayExpiresAt}
              onExpired={onCountdownExpired}
            />
          )}
        </div>

        <div className="sepay-custom-transfer-details">
          <dl className="sepay-order-meta">
            <div><dt>Mã đơn hàng</dt><dd title={orderId}>{orderId}</dd></div>
            <div><dt>Trạng thái</dt><dd>{statusLabel}</dd></div>
            <div><dt>Thời gian tạo đơn</dt><dd>{formatCreatedAt(createdAt)}</dd></div>
            <div><dt>Số tiền cần thanh toán</dt><dd>{formatCurrency(displayAmount)}</dd></div>
            {paymentInformation && (
              <>
                <div><dt>Ngân hàng</dt><dd>{paymentInformation.bankName}</dd></div>
                <div><dt>Số tài khoản</dt><dd>{paymentInformation.accountNumber}</dd></div>
                <div><dt>Chủ tài khoản</dt><dd>{paymentInformation.accountName}</dd></div>
              </>
            )}
          </dl>

          {paymentInformation && (
            <button
              type="button"
              className="sepay-copy-details-button"
              onClick={() => void copyValue(accountText, 'account')}
            >
              {copyStatus === 'account' ? <Check size={16} /> : <Clipboard size={16} />}
              {copyStatus === 'account' ? 'Đã sao chép thông tin' : 'Sao chép thông tin tài khoản'}
            </button>
          )}

          {displayTransferContent && (
            <div className="sepay-transfer-reference">
              <span>Nội dung chuyển khoản chính xác</span>
              <div>
                <code>{displayTransferContent}</code>
                <button
                  type="button"
                  onClick={() => void copyValue(displayTransferContent, 'description')}
                  aria-label="Sao chép nội dung chuyển khoản"
                >
                  {copyStatus === 'description' ? <Check size={16} /> : <Clipboard size={16} />}
                  {copyStatus === 'description' ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <p>Chuyển đúng số tiền và giữ nguyên nội dung trên để hệ thống nhận diện đơn hàng.</p>
            </div>
          )}

        

          <p className="sepay-copy-feedback" aria-live="polite">
            {copyStatus === 'error' ? 'Không thể sao chép tự động. Vui lòng chọn và sao chép nội dung thủ công.' : ''}
          </p>
        </div>
      </div>
    </section>
  )
}

export default SePayQrPaymentCard

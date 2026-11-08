import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Smartphone,
  Type,
} from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { sepayApi } from './sepayApi'

const POLL_INTERVAL_MS = 5000
const MAX_POLL_ATTEMPTS = 12
const ORDER_HOLD_MINUTES = 15

const formatCurrency = (amount: number) =>
  amount.toLocaleString('vi-VN') + ' \u0111'

interface SePayVietQRProps {
  courseId: string
  amount: number
  transferContent: string
  expiredAt: string
  onPaymentSuccess: (orderId: string) => void
}

export function SePayVietQR({
  courseId,
  amount,
  transferContent,
  expiredAt,
  onPaymentSuccess,
}: SePayVietQRProps) {
  const { accessToken } = useAuth()
  const [status, setStatus] = useState<
    'idle' | 'waiting' | 'paid' | 'expired' | 'error'
  >('idle')
  const [pollError, setPollError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [viQrUrl, setViQrUrl] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  const clearPoll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearPoll()
    }
  }, [clearPoll])


  const startPayment = useCallback(async () => {
    if (!accessToken) {
      setPollError('Ph\u00ean \u0111\u0103ng nh\u1eadp \u0111\u00e3 h\u1ebft h\u1ea1n. Vui l\u00f2ng \u0111\u0103ng nh\u1eadp l\u1ea1i.')
      setStatus('error')
      return
    }

    clearPoll()
    setStatus('waiting')
    setPollError(null)
    setAttempts(0)

    try {
      const { orderId, vietQrUrl } = await sepayApi.createOrder(
        {
          courseId,
          amount,
          transferContent,
          expiredAt,
        },
        accessToken,
      )

      if (!mountedRef.current) return
      setViQrUrl(vietQrUrl)

      intervalRef.current = setInterval(async () => {
        if (!mountedRef.current) return

        try {
          const order = await sepayApi.getOrderStatus(orderId, accessToken)

          if (!mountedRef.current) return

          if (order.status === 'paid') {
            clearPoll()
            setStatus('paid')
            onPaymentSuccess(orderId)
            return
          }

          if (
            order.status === 'expired' ||
            order.status === 'cancelled' ||
            order.status === 'failed'
          ) {
            clearPoll()
            setStatus('expired')
            return
          }

          setAttempts((prev) => prev + 1)
          if (attempts + 1 >= MAX_POLL_ATTEMPTS) {
            clearPoll()
            setStatus('expired')
          }
        } catch (error) {
          console.error('[SePayVietQR] Poll failed:', error)
          setAttempts((prev) => prev + 1)
          if (attempts + 1 >= MAX_POLL_ATTEMPTS) {
            clearPoll()
            setPollError(
              'Kh\u00f4ng th\u1ec3 ki\u1ec3m tra tr\u1ea1ng th\u00e1i thanh to\u00e1n. Vui l\u00f2ng th\u1eeb l\u1ea1i sau.',
            )
            setStatus('error')
          }
        }
      }, POLL_INTERVAL_MS)
    } catch (error) {
      if (!mountedRef.current) return
      clearPoll()
      setStatus('error')
      setPollError(
        error instanceof Error ? error.message : 'Kh\u00f4ng th\u1ec3 t\u1ea1o \u0111\u01a1n h\u00e0ang thanh to\u00e1n.',
      )
    }
  }, [
    accessToken,
    courseId,
    amount,
    transferContent,
    expiredAt,
    attempts,
    clearPoll,
    onPaymentSuccess,
  ])

  useEffect(() => {
    if (status === 'idle' && accessToken) {
      startPayment()
    }
  }, [status, accessToken, startPayment])

  const remainingMinutes = ORDER_HOLD_MINUTES

  if (status === 'paid') {
    return (
      <div className="sepay-vietqr pay-success" role="status" aria-label="Thanh to\u00e1n th\u00e0nh c\u00f4ng">
        <div className="sepay-status-icon"><CheckCircle2 size={32} /></div>
        <h3>Thanh to\u00e1n th\u00e0nh c\u00f4ng!</h3>
        <p>\u0110\u01a1n h\u00e0ang c\u1ee7a b\u00e1n \u0111\u00e3 \u0111\u01b0\u01a1c x\u00e1c nh\u1eadn. Kh\u00f3a h\u1ecdc \u0111\u00e3 \u0111\u01b0\u01a1c kh\u00f3a.</p>
        <p className="sepay-note">\u0110ang chuy\u1ec3n h\u01b0\u1edbi \u0111\u1ebfn trang ho\u00e0n t\u1ea5t\u2026</p>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="sepay-vietqr pay-expired" role="alert" aria-label="\u0110\u01a1n h\u00e0ang \u0111\u00e3 h\u1ebft h\u1ea1n">
        <div className="sepay-status-icon"><AlertTriangle size={32} /></div>
        <h3>\u0110\u01a1n h\u00e0ang \u0111\u00e3 h\u1ebft h\u1ea1n</h3>
        <p>
          Th\u1eddi gian thanh to\u00e1n ({remainingMinutes} ph\u00fat) \u0111\u00e3 h\u1ebft. Vui l\u00f2ng b\u1eaft \u0111\u1ea7u l\u1ea1i quy tr\u00ecnh \u0111\u0103ng k\u00fd.
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="sepay-vietqr pay-error" role="alert" aria-label="L\u1ed7i thanh to\u00e1n">
        <div className="sepay-status-icon"><AlertCircle size={32} /></div>
        <h3>C\u00f3 l\u1ed7i x\u1ea3y ra</h3>
        <p>{pollError || 'Kh\u00f4ng th\u1ec3 x\u1eef l\u00fd thanh to\u00e1n.'}</p>
      </div>
    )
  }

  return (
    <div className="sepay-vietqr pay-waiting">
      <div className="sepay-qr-card">
        <div className="sepay-qr-header">
          <Smartphone size={16} />
          <span>Qu\u1ebt m\u00e3 QR \u0111\u1ec3 thanh to\u00e1n</span>
        </div>

        {viQrUrl ? (
          <div className="sepay-qr-image-container">
            <img
              src={viQrUrl}
              alt="M\u00e3 QR thanh to\u00e1n SePay VietQR"
              className="sepay-qr-image"
              loading="eager"
            />
          </div>
        ) : (
          <div className="sepay-qr-placeholder">
            <Loader2 size={24} className="sepay-loader" />
            <p>\u0110ang t\u1ea1o m\u00e3 QR\u2026</p>
          </div>
        )}

        <div className="sepay-qr-info">
          <div className="sepay-info-row">
            <span className="sepay-info-label">S\u1ed1 ti\u1ec1n</span>
            <span className="sepay-info-value">{formatCurrency(amount)}</span>
          </div>
          <div className="sepay-info-row">
            <span className="sepay-info-label">N\u1ed9i dung chuy\u1ec3n kho\u1ea3n</span>
            <span className="sepay-info-value mono">{transferContent}</span>
          </div>
          <div className="sepay-info-row">
            <span className="sepay-info-label">Ng\u00e2n h\u00e0ng</span>
            <span className="sepay-info-value">SePay VietQR</span>
          </div>
          <div className="sepay-info-row">
            <span className="sepay-info-label">Th\u1eddi gian g\u1eedi \u0111\u01a1n</span>
            <span className="sepay-info-value">{remainingMinutes} ph\u00fat</span>
          </div>
        </div>

        <p className="sepay-instruction">
          M\u1ed9 \u1ee6ng d\u1ee5ng ng\u00e2n h\u00e0ang tr\u00ean \u0111i\u1ec7n tho\u1ea1i \u2192 ch\u1ecdn <strong>Qu\u1ebt QR</strong> \u2192 qu\u1ebt m\u00e3 tr\u00ean \u2192
          x\u00e1c nh\u1eadn chuy\u1ec3n kho\u1ea3n. N\u1ed9i dung chuy\u1ec3n kho\u1ea3n \u0111\u00e3 \u0111\u01b0\u01a1c ghi s\u00e2n, vui l\u00f4ng kh\u00f4ng s\u1eefa \u0111\u1ed5i.
        </p>

        <div className="sepay-qr-actions">
          <a
            href={viQrUrl || '#'}
            target="_blank"
            rel="noreferrer"
            className={`sepay-button sepay-button-download${!viQrUrl ? ' disabled' : ''}`}
            aria-disabled={!viQrUrl}
            onClick={!viQrUrl ? (e) => e.preventDefault() : undefined}
          >
            <ExternalLink size={14} /> T\u1ea3i m\u00e3 QR
          </a>
          <button
            className="sepay-button sepay-button-copy"
            onClick={() => {
              if (!viQrUrl) return
              navigator.clipboard.writeText(viQrUrl)
            }}
            disabled={!viQrUrl}
          >
            <Type size={14} /> Sao ch\u00e9p li\u00ean k\u1ebft QR
          </button>
        </div>

        <div className="sepay-polling">
          <Clock3 size={14} />
          <span>\u0110ang ch\u1ed3i x\u00e1c nh\u1eadn thanh to\u00e1n\u2026</span>
        </div>
      </div>

      <div className="sepay-note-card">
        <p><strong>L\u01b0u \u00fd:</strong></p>
        <ul>
          <li>
            M\u00e3 QR \u0111\u01b0\u01a1c t\u1ea1o \u0111\u1ed9ng cho \u0111\u01a1n h\u00e0ang c\u1ee7a b\u00e1n. N\u1ed9i dung chuy\u1ec3n kho\u1ea3n l\u00e0{' '}
            <code>{transferContent}</code>.
          </li>
          <li>Kh\u00f4ng ch\u1ecnh s\u1eeda n\u1ed9i dung chuy\u1ec3n kho\u1ea3n khi thanh to\u00e1n.</li>
          <li>
            \u0110\u01a1n h\u00e0ang s\u1ebd t\u1ef7 \u0111\u1ed9ng h\u1ebft h\u1ea1n sau {remainingMinutes} ph\u00fat n\u1ebfu ch\u01b0a nh\u1eadn \u0111\u01b0\u1ee3c ti\u1ec1n.
          </li>
          <li>
            Sau khi thanh to\u00e1n th\u00e0nh c\u00f4ng, b\u00e1n s\u1ebd \u0111\u01b0\u01a1c chuy\u1ec3n h\u01b0\u1edbi t\u01b0\u01a1ng t\u1ef1c v\u00e0 kh\u00f3a h\u1ecdc s\u1ebd \u0111\u01b0\u01a1c kh\u00f3a.
          </li>
        </ul>
      </div>
    </div>
  )
}